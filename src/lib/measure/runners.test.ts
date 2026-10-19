import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DOWNLOAD_REQUEST_BYTES, runDownload, runPing } from './runners.ts';
import { InvalidApiResponseError } from './responseGuards.ts';

const BASE = 'https://api.exemplo.com/api/speed-tests';

type FakeFetch = typeof fetch & { calls: string[] };

function fakeFetch(respond: (url: string, init: RequestInit | undefined, call: number) => Response | Promise<Response>): FakeFetch {
  const calls: string[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    return respond(url, init, calls.length);
  }) as FakeFetch;
  fn.calls = calls;
  return fn;
}

const pong = () => Response.json({ pong: true, timestamp: Date.now() });

describe('runPing', () => {
  test('PING-01: sends exactly 11 sequential pings to {base}/ping without cache', async () => {
    const inits: (RequestInit | undefined)[] = [];
    const fetch = fakeFetch((_url, init) => {
      inits.push(init);
      return pong();
    });

    await runPing({ baseUrl: BASE, fetch });

    assert.equal(fetch.calls.length, 11);
    assert.ok(fetch.calls.every((url) => url === `${BASE}/ping`));
    assert.ok(inits.every((init) => init?.cache === 'no-store'));
  });

  test('PING-01/02/03: latency and jitter come from the round trips, first one dropped', async () => {
    // Clock: each ping reads now() before and after; the first round trip takes 300 ms, the rest alternate 10/20 ms.
    const durations = [300, 10, 20, 10, 20, 10, 20, 10, 20, 10, 20];
    const ticks: number[] = [];
    let t = 0;
    for (const d of durations) {
      ticks.push(t, t + d);
      t += d + 5;
    }
    const now = () => ticks.shift() ?? 0;

    const result = await runPing({ baseUrl: BASE, fetch: fakeFetch(pong), now });

    assert.deepEqual(result, { latency: 15, jitter: 10 });
  });

  test('VAL-01: an HTML answer stops at the first ping with InvalidApiResponseError', async () => {
    const fetch = fakeFetch(() => new Response('<!doctype html><html>', { headers: { 'content-type': 'text/html' } }));

    await assert.rejects(runPing({ baseUrl: BASE, fetch }), InvalidApiResponseError);
    assert.equal(fetch.calls.length, 1);
  });

  test('an aborted signal rejects with AbortError', async () => {
    const controller = new AbortController();
    controller.abort();

    await assert.rejects(runPing({ baseUrl: BASE, fetch: fakeFetch(pong), signal: controller.signal }), {
      name: 'AbortError',
    });
  });
});

// Download body that trickles `chunk` bytes every `everyMs` until it has sent `total`
// (Infinity = never ends) or the request signal aborts.
function trickle(init: RequestInit | undefined, chunk: number, everyMs: number, total = Infinity, onEnd?: () => void) {
  let sent = 0;
  let timer: ReturnType<typeof setInterval>;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      let ended = false;
      const finish = (error?: unknown) => {
        if (ended) return;
        ended = true;
        clearInterval(timer);
        onEnd?.();
        if (error) controller.error(error);
        else controller.close();
      };
      init?.signal?.addEventListener('abort', () => finish(init.signal?.reason));
      timer = setInterval(() => {
        if (sent >= total) return finish();
        controller.enqueue(new Uint8Array(chunk));
        sent += chunk;
      }, everyMs);
    },
  });
  return new Response(body, {
    headers: { 'content-type': 'application/octet-stream', 'content-length': String(DOWNLOAD_REQUEST_BYTES) },
  });
}

const phaseConfig = (overrides: Partial<{ connections: number; durationMs: number }> = {}) => ({
  connections: 4,
  durationMs: 300,
  warmupMs: 100,
  sampleMs: 50,
  ...overrides,
});

describe('runDownload', () => {
  test('MEAS-01: keeps exactly `connections` requests in flight', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetch = fakeFetch((_url, init) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      return trickle(init, 1000, 5, 10_000, () => inFlight--);
    });

    await runDownload({ baseUrl: BASE, fetch, config: phaseConfig({ connections: 4 }) });

    assert.equal(maxInFlight, 4);
    assert.ok(fetch.calls.length > 4, 'finished requests are replaced by new ones');
  });

  test('MEAS-02: stops at the deadline and aborts every open request', async () => {
    const signals: AbortSignal[] = [];
    const fetch = fakeFetch((_url, init) => {
      signals.push(init!.signal!);
      return trickle(init, 1000, 10);
    });

    const started = performance.now();
    await runDownload({ baseUrl: BASE, fetch, config: phaseConfig({ durationMs: 300 }) });
    const elapsed = performance.now() - started;

    assert.ok(elapsed >= 300 && elapsed <= 550, `took ${elapsed} ms`);
    assert.ok(signals.length >= 4);
    assert.ok(signals.every((signal) => signal.aborted));
  });

  test('MEAS-06: counts bytes read from requests aborted at the deadline', async () => {
    // No request ever completes: every byte comes from a stream cut by the deadline.
    const fetch = fakeFetch((_url, init) => trickle(init, 1000, 10));

    const result = await runDownload({ baseUrl: BASE, fetch, config: phaseConfig() });

    assert.ok(result.bytes > 0);
    assert.ok(result.mbps > 0);
    assert.equal(result.samples[result.samples.length - 1].bytes, result.bytes);
  });

  test('MEAS-10: asks for 25,000,000 bytes per request', async () => {
    const fetch = fakeFetch((_url, init) => trickle(init, 1000, 10));

    await runDownload({ baseUrl: BASE, fetch, config: phaseConfig() });

    assert.equal(DOWNLOAD_REQUEST_BYTES, 25_000_000);
    assert.ok(fetch.calls.every((url) => url === `${BASE}/download?bytes=25000000`));
  });

  test('MEAS-08: reports the partial rate on every sample', async () => {
    const live: number[] = [];
    const fetch = fakeFetch((_url, init) => trickle(init, 1000, 10));

    const result = await runDownload({ baseUrl: BASE, fetch, config: phaseConfig(), onLive: (mbps) => live.push(mbps) });

    assert.equal(live.length, result.samples.length - 1);
    assert.ok(live.length >= 5);
    assert.ok(live.every((mbps) => Number.isFinite(mbps) && mbps >= 0));
  });

  test('VAL-02: an HTML answer fails the phase and aborts the other connections', async () => {
    const signals: AbortSignal[] = [];
    const fetch = fakeFetch((_url, init, call) => {
      signals.push(init!.signal!);
      if (call === 3) return new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } });
      return trickle(init, 1000, 10);
    });

    const started = performance.now();
    await assert.rejects(
      runDownload({ baseUrl: BASE, fetch, config: phaseConfig({ durationMs: 5000 }) }),
      InvalidApiResponseError,
    );

    assert.ok(performance.now() - started < 1000, 'does not wait for the deadline');
    assert.ok(signals.every((signal) => signal.aborted));
  });

  test('an external abort rejects with AbortError', async () => {
    const controller = new AbortController();
    const fetch = fakeFetch((_url, init) => trickle(init, 1000, 10));
    setTimeout(() => controller.abort(), 50);

    await assert.rejects(
      runDownload({ baseUrl: BASE, fetch, signal: controller.signal, config: phaseConfig({ durationMs: 5000 }) }),
      { name: 'AbortError' },
    );
  });
});

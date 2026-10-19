import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DOWNLOAD_REQUEST_BYTES,
  runDownload,
  runPing,
  runUpload,
  UPLOAD_INITIAL_BYTES,
  UPLOAD_MAX_BYTES,
} from './runners.ts';
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

// Upload endpoint double: acknowledges after `delayMs` with the received size (or `ackSize`).
function uploadServer(delayMs: number, ackSize?: (sent: number) => number) {
  const sizes: number[] = [];
  const confirmed: number[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const fetch = fakeFetch(
    (_url, init) =>
      new Promise<Response>((resolve, reject) => {
        const sent = (init!.body as Blob).size;
        sizes.push(sent);
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        const timer = setTimeout(() => {
          inFlight--;
          confirmed.push(sent);
          resolve(Response.json({ size: ackSize ? ackSize(sent) : sent, timestamp: Date.now() }));
        }, delayMs);
        init!.signal!.addEventListener('abort', () => {
          clearTimeout(timer);
          inFlight--;
          reject(init!.signal!.reason);
        });
      }),
  );
  return { fetch, sizes, confirmed, maxInFlight: () => maxInFlight };
}

describe('runUpload', () => {
  test('MEAS-11: starts at 250,000 bytes and doubles fast requests up to 16,000,000', async () => {
    const server = uploadServer(5);

    await runUpload({ baseUrl: BASE, fetch: server.fetch, config: phaseConfig({ connections: 4, durationMs: 400 }) });

    assert.equal(UPLOAD_INITIAL_BYTES, 250_000);
    assert.equal(UPLOAD_MAX_BYTES, 16_000_000);
    assert.deepEqual(server.sizes.slice(0, 4), [250_000, 250_000, 250_000, 250_000]);
    const allowed = new Set([250_000, 500_000, 1_000_000, 2_000_000, 4_000_000, 8_000_000, 16_000_000]);
    assert.ok(server.sizes.every((size) => allowed.has(size)), `sizes ${[...new Set(server.sizes)]}`);
    assert.equal(Math.max(...server.sizes), 16_000_000);
  });

  test('MEAS-11: a request slower than 500 ms keeps the size', async () => {
    const server = uploadServer(600);

    await runUpload({ baseUrl: BASE, fetch: server.fetch, config: phaseConfig({ connections: 4, durationMs: 1500 }) });

    assert.ok(server.sizes.length > 4, 'each connection sent a second request');
    assert.ok(server.sizes.every((size) => size === 250_000));
  });

  test('MEAS-07: counts only server-confirmed bytes', async () => {
    const server = uploadServer(20);

    const result = await runUpload({ baseUrl: BASE, fetch: server.fetch, config: phaseConfig({ durationMs: 300 }) });

    const confirmed = server.confirmed.reduce((sum, size) => sum + size, 0);
    assert.equal(result.bytes, confirmed);
    assert.ok(result.mbps > 0);
  });

  test('MEAS-07: requests aborted at the deadline count zero', async () => {
    const server = uploadServer(5000);

    const result = await runUpload({ baseUrl: BASE, fetch: server.fetch, config: phaseConfig({ durationMs: 300 }) });

    assert.equal(server.confirmed.length, 0);
    assert.equal(result.bytes, 0);
    assert.equal(result.mbps, 0);
  });

  test('MEAS-01/02: exactly `connections` in flight and ends at the deadline', async () => {
    const server = uploadServer(50);

    const started = performance.now();
    await runUpload({ baseUrl: BASE, fetch: server.fetch, config: phaseConfig({ connections: 6, durationMs: 300 }) });
    const elapsed = performance.now() - started;

    assert.equal(server.maxInFlight(), 6);
    assert.ok(elapsed >= 300 && elapsed <= 550, `took ${elapsed} ms`);
  });

  test('SPEC_DEVIATION (MEAS-03/07): the upload window ends at the last confirmation, not at the deadline', async () => {
    // Each connection's first request is confirmed after 50 ms; the next ones never finish
    // and are aborted at the 400 ms deadline.
    const ends: number[] = [];
    let call = 0;
    const fetch = fakeFetch(
      (_url, init) =>
        new Promise<Response>((resolve, reject) => {
          const sent = (init!.body as Blob).size;
          const fast = ++call <= 4;
          const timer = setTimeout(() => {
            ends.push(performance.now());
            resolve(Response.json({ size: sent, timestamp: Date.now() }));
          }, fast ? 50 : 5000);
          init!.signal!.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(init!.signal!.reason);
          });
        }),
    );

    const result = await runUpload({ baseUrl: BASE, fetch, config: phaseConfig({ connections: 4, durationMs: 400 }) });

    const last = result.samples[result.samples.length - 1];
    assert.equal(result.bytes, 4 * 250_000);
    assert.equal(last.bytes, result.bytes);
    assert.ok(last.t < 150, `window ends at ${last.t} ms, not at the 400 ms deadline`);
    // Phase shorter than warm-up + 1 s: whole window up to the last confirmation (MEAS-04).
    const expected = (result.bytes * 8) / (last.t / 1000) / 1e6;
    assert.ok(Math.abs(result.mbps - expected) < 1e-6, `${result.mbps} != ${expected}`);
  });

  test('edge: on a slow link (~5 Mbps) every connection still confirms its first request', async () => {
    // 250,000 bytes over 6 connections sharing 5 Mbps take ~2.4 s each.
    const server = uploadServer(2400);

    const result = await runUpload({ baseUrl: BASE, fetch: server.fetch, config: phaseConfig({ connections: 6, durationMs: 3000 }) });

    assert.equal(server.confirmed.length, 6);
    assert.equal(result.bytes, 6 * 250_000);
    assert.ok(result.mbps > 0);
  });

  test('VAL-03: a size different from what was sent fails the phase', async () => {
    const server = uploadServer(5, () => 0);

    await assert.rejects(
      runUpload({ baseUrl: BASE, fetch: server.fetch, config: phaseConfig({ durationMs: 5000 }) }),
      InvalidApiResponseError,
    );
  });

  test('posts octet-stream to {base}/upload', async () => {
    const inits: RequestInit[] = [];
    const server = uploadServer(5);
    const fetch = fakeFetch((url, init) => {
      inits.push(init!);
      assert.equal(url, `${BASE}/upload`);
      return server.fetch(url, init);
    });

    await runUpload({ baseUrl: BASE, fetch, config: phaseConfig({ durationMs: 200 }) });

    assert.ok(inits.every((init) => init.method === 'POST'));
    // Chromium uploads Blob bodies ~5x faster than ArrayBufferView bodies.
    assert.ok(inits.every((init) => init.body instanceof Blob));
    assert.ok(inits.every((init) => new Headers(init.headers).get('content-type') === 'application/octet-stream'));
  });
});

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { runPing } from './runners.ts';
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

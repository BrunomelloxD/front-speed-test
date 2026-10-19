import { pingStats } from './latency.ts';
import { assertPong } from './responseGuards.ts';

export type RunnerDeps = {
  /** `${origin}/api/speed-tests` from apiBaseUrl.ts */
  baseUrl: string;
  fetch: typeof fetch;
  signal?: AbortSignal;
  now?: () => number;
};

const PING_COUNT = 11;

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** 11 sequential pings; the first warms the connection and is dropped (PING-01). */
export async function runPing({ baseUrl, fetch, signal, now = () => performance.now() }: RunnerDeps) {
  const samples: number[] = [];
  for (let i = 0; i < PING_COUNT; i++) {
    signal?.throwIfAborted();
    const start = now();
    const res = await fetch(`${baseUrl}/ping`, { cache: 'no-store', signal });
    const body = await readJson(res);
    samples.push(now() - start);
    assertPong(body);
  }
  return pingStats(samples);
}

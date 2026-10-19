import type { MeasureConfig } from './config.ts';
import { pingStats } from './latency.ts';
import { assertDownloadResponse, assertPong } from './responseGuards.ts';
import { liveMbps, stableMbps, type Sample } from './throughput.ts';

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

export type PhaseConfig = Pick<MeasureConfig, 'connections' | 'durationMs' | 'warmupMs' | 'sampleMs'>;
export type PhaseDeps = RunnerDeps & { config: PhaseConfig; onLive?: (mbps: number) => void };
export type PhaseResult = { mbps: number; bytes: number; samples: Sample[] };

export const DOWNLOAD_REQUEST_BYTES = 25_000_000;

/**
 * Runs `connections` copies of `loop` until the deadline (MEAS-01, MEAS-02).
 * The deadline aborts in-flight requests and ends the phase normally; any other
 * failure aborts the remaining connections and rejects the phase.
 */
async function runParallel(
  { signal, config, now = () => performance.now() }: Pick<PhaseDeps, 'signal' | 'config' | 'now'>,
  loop: (phaseSignal: AbortSignal) => Promise<void>,
): Promise<void> {
  signal?.throwIfAborted();
  const phase = new AbortController();
  const start = now();
  let deadlineReached = false;
  let deadline: ReturnType<typeof setTimeout>;
  // Timers may fire ~1 ms early relative to performance.now(): re-arm for what is left.
  const armDeadline = (ms: number) => {
    deadline = setTimeout(() => {
      const left = config.durationMs - (now() - start);
      if (left > 0) return armDeadline(left);
      deadlineReached = true;
      phase.abort(new DOMException('Fim da fase', 'TimeoutError'));
    }, ms);
  };
  armDeadline(config.durationMs);
  const forwardAbort = () => phase.abort(signal?.reason);
  signal?.addEventListener('abort', forwardAbort);

  try {
    await Promise.all(
      Array.from({ length: config.connections }, async () => {
        try {
          await loop(phase.signal);
        } catch (error) {
          if (deadlineReached && !signal?.aborted) return;
          phase.abort(error);
          throw error;
        }
      }),
    );
  } finally {
    clearTimeout(deadline!);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

/** Parallel, time-bound download counting the bytes actually read (MEAS-06). */
export async function runDownload(deps: PhaseDeps): Promise<PhaseResult> {
  const { baseUrl, fetch, config, onLive, now = () => performance.now() } = deps;
  const url = `${baseUrl}/download?bytes=${DOWNLOAD_REQUEST_BYTES}`;
  const t0 = now();
  let received = 0;
  const samples: Sample[] = [{ t: 0, bytes: 0 }];
  const record = () => {
    samples.push({ t: now() - t0, bytes: received });
    onLive?.(liveMbps(samples));
  };

  const sampler = setInterval(record, config.sampleMs);
  try {
    await runParallel(deps, async (phaseSignal) => {
      while (!phaseSignal.aborted) {
        const res = await fetch(url, { cache: 'no-store', signal: phaseSignal });
        assertDownloadResponse(res, DOWNLOAD_REQUEST_BYTES);
        const reader = res.body!.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
        }
      }
    });
  } finally {
    clearInterval(sampler);
  }
  record();

  return { mbps: stableMbps(samples, config.warmupMs), bytes: received, samples };
}

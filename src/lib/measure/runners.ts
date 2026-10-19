import type { MeasureConfig } from './config.ts';
import { pingStats } from './latency.ts';
import { assertDownloadResponse, assertPong, assertUploadAck } from './responseGuards.ts';
import { confirmedSeries, liveMbps, stableMbps, type ConfirmedRequest, type Sample } from './throughput.ts';

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

export const UPLOAD_INITIAL_BYTES = 250_000;
export const UPLOAD_MAX_BYTES = 16_000_000;
const UPLOAD_GROW_BELOW_MS = 500;

// One random block, tiled once and sliced per request (getRandomValues caps at 65,536 bytes).
let uploadPayload: Uint8Array<ArrayBuffer> | undefined;
function getUploadPayload(): Uint8Array<ArrayBuffer> {
  if (!uploadPayload) {
    const block = crypto.getRandomValues(new Uint8Array(65_536));
    uploadPayload = new Uint8Array(new ArrayBuffer(UPLOAD_MAX_BYTES));
    for (let offset = 0; offset < UPLOAD_MAX_BYTES; offset += block.length) {
      uploadPayload.set(block.subarray(0, UPLOAD_MAX_BYTES - offset), offset);
    }
  }
  return uploadPayload;
}

/**
 * Parallel, time-bound upload measured only from server-confirmed bytes (MEAS-07).
 * Request size starts at 250,000 bytes and doubles while requests take < 500 ms (MEAS-11).
 */
export async function runUpload(deps: PhaseDeps): Promise<PhaseResult> {
  const { baseUrl, fetch, config, onLive, now = () => performance.now() } = deps;
  const payload = getUploadPayload();
  const t0 = now();
  const confirmed: ConfirmedRequest[] = [];
  const times: number[] = [0];
  const record = () => {
    times.push(now() - t0);
    onLive?.(liveMbps(confirmedSeries(confirmed, times)));
  };

  const sampler = setInterval(record, config.sampleMs);
  try {
    await runParallel(deps, async (phaseSignal) => {
      let size = UPLOAD_INITIAL_BYTES;
      while (!phaseSignal.aborted) {
        const start = now() - t0;
        const res = await fetch(`${baseUrl}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: payload.subarray(0, size),
          cache: 'no-store',
          signal: phaseSignal,
        });
        assertUploadAck(await readJson(res), size);
        const end = now() - t0;
        confirmed.push({ start, end, bytes: size });
        if (end - start < UPLOAD_GROW_BELOW_MS) size = Math.min(size * 2, UPLOAD_MAX_BYTES);
      }
    });
  } finally {
    clearInterval(sampler);
  }

  // SPEC_DEVIATION: MEAS-03's t_end is the last confirmation for uploads, not the deadline.
  // Reason: bytes still in flight at the deadline are never confirmed (MEAS-07), so
  // counting their time would understate the rate.
  const lastConfirmation = Math.max(0, ...confirmed.map((request) => request.end));
  const samples = confirmedSeries(confirmed, [...times.filter((t) => t < lastConfirmation), lastConfirmation]);
  const bytes = confirmed.reduce((sum, request) => sum + request.bytes, 0);

  return { mbps: stableMbps(samples, config.warmupMs), bytes, samples };
}

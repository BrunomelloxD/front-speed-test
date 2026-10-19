import { toMbps } from './units.ts';

/** Cumulative bytes transferred `t` ms after the phase started. */
export type Sample = { t: number; bytes: number };

/** An upload request confirmed by the server, in phase time (ms). */
export type ConfirmedRequest = { start: number; end: number; bytes: number };

// Linear interpolation of the cumulative series at time t (samples sorted by t).
function bytesAt(samples: Sample[], t: number): number {
  if (t <= samples[0].t) return samples[0].bytes;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (t <= b.t) {
      return a.bytes + ((b.bytes - a.bytes) * (t - a.t)) / (b.t - a.t);
    }
  }
  return samples[samples.length - 1].bytes;
}

/**
 * Final throughput over the stable window [warmupMs, end] (MEAS-03).
 * Phases shorter than warmupMs + 1000 ms use the whole window (MEAS-04).
 */
export function stableMbps(samples: Sample[], warmupMs: number): number {
  if (samples.length < 2) return 0;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const from = last.t - first.t >= warmupMs + 1000 ? first.t + warmupMs : first.t;
  return toMbps(last.bytes - bytesAt(samples, from), last.t - from);
}

/** Partial throughput over the last `windowMs` (MEAS-08). */
export function liveMbps(samples: Sample[], windowMs = 1000): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  const from = Math.max(samples[0].t, last.t - windowMs);
  return toMbps(last.bytes - bytesAt(samples, from), last.t - from);
}

/**
 * Cumulative confirmed upload bytes at each time, spreading every request's bytes
 * linearly between its start and end (MEAS-07).
 */
export function confirmedSeries(requests: ConfirmedRequest[], times: number[]): Sample[] {
  return times.map((t) => {
    let bytes = 0;
    for (const { start, end, bytes: size } of requests) {
      if (t >= end) bytes += size;
      else if (t > start) bytes += (size * (t - start)) / (end - start);
    }
    return { t, bytes };
  });
}

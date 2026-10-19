/**
 * Latency and jitter from sequential ping round trips (ms).
 * The first sample pays DNS/TCP/TLS setup and is dropped (PING-01).
 * Latency is the median (PING-02); jitter is the mean absolute difference
 * between consecutive samples (PING-03).
 */
export function pingStats(samplesMs: number[]): { latency: number; jitter: number } {
  const samples = samplesMs.slice(1);
  if (samples.length === 0) return { latency: 0, jitter: 0 };

  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const latency = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  let diffs = 0;
  for (let i = 1; i < samples.length; i++) diffs += Math.abs(samples[i] - samples[i - 1]);
  const jitter = samples.length > 1 ? diffs / (samples.length - 1) : 0;

  return { latency, jitter };
}

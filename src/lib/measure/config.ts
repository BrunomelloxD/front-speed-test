export type MeasureConfig = {
  /** Parallel requests per phase (MEAS-01). */
  connections: number;
  /** Length of each download/upload phase (MEAS-02). */
  durationMs: number;
  /** Start of the phase discarded as TCP slow start (MEAS-03). */
  warmupMs: number;
  /** Interval between throughput samples and live updates (MEAS-08). */
  sampleMs: number;
};

type MeasureEnv = { VITE_TEST_CONNECTIONS?: string; VITE_TEST_DURATION_S?: string };

function bounded(raw: string | undefined, min: number, max: number, fallback: number): number {
  const value = raw?.trim() ? Number(raw) : NaN;
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function parseMeasureConfig(env: MeasureEnv): MeasureConfig {
  return {
    connections: bounded(env.VITE_TEST_CONNECTIONS, 4, 8, 6),
    durationMs: bounded(env.VITE_TEST_DURATION_S, 10, 15, 12) * 1000,
    warmupMs: 2000,
    sampleMs: 200,
  };
}

export type SeriesPoint = { t: number; mbps: number };

const WARMUP_MS = 2000; // must match MeasureConfig.warmupMs

/** SVG path for a phase's live rate over time, plus the warm-up band width. */
export function sparklinePath(points: SeriesPoint[], width: number, height: number, durationMs: number, pad = 6) {
  const warmupWidth = (width * WARMUP_MS) / durationMs;
  if (points.length === 0) return { d: '', warmupWidth, last: null };

  const top = Math.max(...points.map((p) => p.mbps)) * 1.15 || 1;
  const xy = points.map((p) => ({
    x: Math.min(width, (width * p.t) / durationMs),
    y: height - pad - ((height - 2 * pad) * p.mbps) / top,
  }));
  const d = xy.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return { d, warmupWidth, last: xy[xy.length - 1] };
}

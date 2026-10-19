/** 240° gauge with a fixed log scale from 1 to 1000 Mbps (direction A). */
export const GAUGE_TICKS = [1, 10, 50, 100, 250, 500, 1000];

export const GAUGE = { width: 320, height: 250, cx: 160, cy: 148, r: 106, stroke: 14, labelRadius: 138 } as const;

const SWEEP = 240;

/** Degrees clockwise from 12 o'clock, clamped to [-120, 120]. */
export function angleFor(mbps: number): number {
  const t = mbps <= 1 ? 0 : Math.min(Math.log10(mbps) / 3, 1);
  return -SWEEP / 2 + SWEEP * t;
}

export function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

export function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

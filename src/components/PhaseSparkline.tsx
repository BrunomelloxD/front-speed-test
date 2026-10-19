import { formatNumber } from '../lib/ui/format';
import { sparklinePath, type SeriesPoint } from '../lib/ui/sparkline';

interface PhaseSparklineProps {
  points: SeriesPoint[];
  durationMs: number;
  tone: 'accent' | 'upload';
  /** Hide the legend, the clock and the axis (result summary). */
  compact?: boolean;
}

const W = 600;
const H = 96;

export function PhaseSparkline({ points, durationMs, tone, compact = false }: PhaseSparklineProps) {
  const { d, warmupWidth, last } = sparklinePath(points, W, H, durationMs);
  const elapsed = points.length ? points[points.length - 1].t : 0;
  const toneClass = tone === 'accent' ? 'text-accent' : 'text-upload';

  return (
    <figure className="w-full">
      {!compact && (
        <figcaption className="mb-2 flex items-center justify-between gap-3 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-[3px] bg-hairline" aria-hidden="true" />
            0–2 s: aquecimento, descartado do resultado
          </span>
          <span className="font-mono text-xs text-text-2 tabular-nums">
            {formatNumber(elapsed / 1000)} s de {durationMs / 1000} s
          </span>
        </figcaption>
      )}
      <div className="relative overflow-hidden rounded-xl bg-shell">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`block w-full ${compact ? 'h-14' : 'h-20 sm:h-24'}`} aria-hidden="true">
          <rect x={0} y={0} width={warmupWidth} height={H} fill="rgb(255 255 255 / 0.025)" />
          <line x1={warmupWidth} y1={6} x2={warmupWidth} y2={H - 6} stroke="var(--color-hairline)" vectorEffect="non-scaling-stroke" />
          {d && (
            <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" className={toneClass} />
          )}
        </svg>
        {last && !compact && (
          <span
            className={`absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ${toneClass}`}
            style={{ left: `${(last.x / W) * 100}%`, top: `${(last.y / H) * 100}%` }}
            aria-hidden="true"
          />
        )}
      </div>
      {!compact && (
        <div className="relative mt-1.5 h-4 font-mono text-[11px] text-muted" aria-hidden="true">
          <span className="absolute left-0">0 s</span>
          <span className="absolute -translate-x-1/2" style={{ left: `${(warmupWidth / W) * 100}%` }}>2 s</span>
          <span className="absolute right-0">{durationMs / 1000} s</span>
        </div>
      )}
    </figure>
  );
}

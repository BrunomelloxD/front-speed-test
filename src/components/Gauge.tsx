import type { ReactNode } from 'react';
import { angleFor, arcPath, GAUGE, GAUGE_TICKS, polar } from '../lib/ui/gauge';

interface GaugeProps {
  /** Mbps; null while there is nothing to show. */
  value: number | null;
  state: 'idle' | 'live' | 'final';
  tone: 'accent' | 'upload';
  label: string;
  children?: ReactNode;
}

const { width, height, cx, cy, r, stroke, labelRadius } = GAUGE;
const FULL_ARC = arcPath(cx, cy, r, -120, 120);

export function Gauge({ value, state, tone, label, children }: GaugeProps) {
  const angle = angleFor(value ?? 0);
  const fraction = state === 'idle' || value === null ? 0 : (angle + 120) / 240;
  const toneClass = tone === 'accent' ? 'text-accent' : 'text-upload';

  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={label}>
        <path d={FULL_ARC} fill="none" stroke="var(--color-track)" strokeWidth={stroke} strokeLinecap="round" />
        <path
          d={FULL_ARC}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${fraction} 1`}
          className={`${toneClass} transition-[stroke-dasharray] duration-500 ease-instrument`}
          opacity={fraction === 0 ? 0 : 1}
        />
        {GAUGE_TICKS.map((tick) => {
          const a = angleFor(tick);
          const inner = polar(cx, cy, r + stroke / 2 + 5, a);
          const outer = polar(cx, cy, r + stroke / 2 + 11, a);
          const text = polar(cx, cy, labelRadius, a);
          return (
            <g key={tick}>
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="var(--color-muted)" strokeWidth={1.5} strokeLinecap="round" />
              <text x={text.x} y={text.y + 4} textAnchor="middle" className="fill-text-2 font-mono text-[11px]">
                {tick}
              </text>
            </g>
          );
        })}
        {state !== 'idle' && (
          <line
            x1={cx}
            y1={cy - (r - stroke / 2 - 26)}
            x2={cx}
            y2={cy - (r - stroke / 2 - 6)}
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            className={`${state === 'live' ? 'text-text' : toneClass} transition-transform duration-[400ms] ease-instrument`}
            style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${cx}px ${cy}px` }}
          />
        )}
      </svg>
      {/* Centred on the arc centre (cy / height ≈ 59%) so the content never crosses the arc. */}
      <div className="absolute inset-x-0 top-[59%] flex -translate-y-1/2 flex-col items-center text-center">{children}</div>
    </div>
  );
}

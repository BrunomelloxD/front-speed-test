interface SpeedGaugeProps {
  value: number;
  max?: number;
  label: string;
  unit?: string;
  active?: boolean;
  color?: 'cyan' | 'green';
}

const ARC_RADIUS = 80;
const STROKE_WIDTH = 12;
const CENTER = 100;
const START_ANGLE = 180;
const END_ANGLE = 360;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function SpeedGauge({ value, max = 200, label, unit = 'Mbps', active = false, color = 'cyan' }: SpeedGaugeProps) {
  const percentage = Math.min(Math.max(value / max, 0), 1);
  const currentAngle = START_ANGLE + percentage * (END_ANGLE - START_ANGLE);

  const bgArc = describeArc(CENTER, CENTER, ARC_RADIUS, START_ANGLE, END_ANGLE);
  const valueArc = describeArc(CENTER, CENTER, ARC_RADIUS, START_ANGLE, currentAngle);
  const needle = polarToCartesian(CENTER, CENTER, ARC_RADIUS - 20, currentAngle);

  const gradientId = `gauge-gradient-${color}`;
  const glowId = `gauge-glow-${color}`;
  const gradientColors = color === 'cyan'
    ? { start: '#22d3ee', end: '#a78bfa' }
    : { start: '#34d399', end: '#22d3ee' };

  return (
    <div className="flex flex-col items-center w-52 sm:w-56">
      <svg viewBox="0 100 200 110" className="w-full" aria-label={`${label}: ${value.toFixed(1)} ${unit}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradientColors.start} />
            <stop offset="100%" stopColor={gradientColors.end} />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path
          d={bgArc}
          fill="none"
          stroke="#334155"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />

        {/* Value arc */}
        {value > 0 && (
          <path
            d={valueArc}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            filter={active ? `url(#${glowId})` : undefined}
            className="transition-all duration-500"
            style={{ animation: active ? 'gauge-pulse 1.5s ease-in-out infinite' : undefined }}
          />
        )}

        {/* Needle dot */}
        <circle
          cx={needle.x}
          cy={needle.y}
          r="5"
          fill="white"
          className="transition-all duration-500"
          style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' }}
        />

        {/* Center dot */}
        <circle cx={CENTER} cy={CENTER} r="3" fill="#64748b" />

        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const angle = START_ANGLE + t * (END_ANGLE - START_ANGLE);
          const outer = polarToCartesian(CENTER, CENTER, ARC_RADIUS + 8, angle);
          const inner = polarToCartesian(CENTER, CENTER, ARC_RADIUS + 16, angle);
          const tickLabel = Math.round(t * max);
          return (
            <g key={i}>
              <line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke="#475569" strokeWidth="1.5" />
              <text x={inner.x} y={inner.y + 12} textAnchor="middle" fill="#64748b" fontSize="9">
                {tickLabel}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-col items-center -mt-2">
        <span className="text-4xl font-bold tabular-nums text-shadow-glow tracking-tight">
          {value.toFixed(1)}
        </span>
        <span className="text-xs text-slate-400 uppercase tracking-widest mt-0.5">{unit}</span>
        <span className={`text-xs font-semibold uppercase tracking-wider mt-1 ${
          color === 'cyan' ? 'text-cyan-400' : 'text-emerald-400'
        }`}>
          {label}
        </span>
      </div>
    </div>
  );
}

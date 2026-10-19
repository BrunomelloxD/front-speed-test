import { formatNumber } from '../lib/ui/format';

export type MetricState = 'empty' | 'live' | 'final';
type Tone = 'accent' | 'upload' | 'neutral';

const TONE_TEXT: Record<Tone, string> = { accent: 'text-accent', upload: 'text-upload', neutral: 'text-text-2' };
const TONE_BG: Record<Tone, string> = { accent: 'bg-accent/12', upload: 'bg-upload/12', neutral: 'bg-hairline' };

export function StatusBadge({ kind, tone = 'accent' }: { kind: 'live' | 'final' | 'best'; tone?: Tone }) {
  if (kind === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-0.5 text-[13px] font-medium text-text-2">
        <span className={`size-1.5 rounded-full bg-current motion-safe:animate-pulse ${TONE_TEXT[tone]}`} aria-hidden="true" />
        ao vivo
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${TONE_BG[tone]} ${TONE_TEXT[tone]}`}>
      {kind === 'final' ? 'final' : 'melhor'}
    </span>
  );
}

interface MetricTileProps {
  label: string;
  value: number | null;
  unit: string;
  state: MetricState;
  tone: Tone;
}

export function MetricTile({ label, value, unit, state, tone }: MetricTileProps) {
  const shown = state === 'empty' ? null : value;
  return (
    <div className="flex min-h-[92px] flex-col justify-between rounded-2xl border border-hairline bg-surface p-3.5 sm:min-h-32 sm:rounded-[20px] sm:p-[18px]">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-text-2 sm:text-sm">{label}</span>
        {state === 'live' && <span className={`size-2 rounded-full bg-current ${TONE_TEXT[tone]}`} aria-hidden="true" />}
        {state === 'final' && <span className={`size-1.5 rounded-sm bg-current ${TONE_TEXT[tone]}`} aria-hidden="true" />}
      </div>
      <p className="flex items-baseline gap-1.5">
        <span
          className={`font-mono text-[28px] font-medium tabular-nums sm:text-[38px] ${
            shown === null ? 'text-muted' : state === 'live' ? 'text-text-2' : 'text-text'
          }`}
        >
          {formatNumber(shown)}
        </span>
        {shown !== null && <span className="text-[13px] font-medium text-text-2 sm:text-[15px]">{unit}</span>}
        <span className="sr-only">{state === 'live' ? ', ao vivo' : state === 'final' ? ', final' : ', sem medição'}</span>
      </p>
    </div>
  );
}

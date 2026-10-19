import type { TestPhase } from '../types/speedTest';

const STEPS = [
  { key: 'ping', label: 'Latência' },
  { key: 'download', label: 'Download' },
  { key: 'upload', label: 'Upload' },
] as const;

const ORDER: Record<TestPhase, number> = { idle: -1, ping: 0, download: 1, upload: 2, done: 3 };

export function Stepper({ phase }: { phase: TestPhase }) {
  const current = ORDER[phase];

  return (
    <ol className="flex items-center gap-2.5 text-[13px] sm:gap-3 sm:text-sm" aria-label="Etapas do teste">
      {STEPS.map((step, i) => {
        const done = current > i;
        const active = current === i;
        return (
          <li key={step.key} className="flex items-center gap-2.5 sm:gap-3" aria-current={active ? 'step' : undefined}>
            {i > 0 && <span className={`h-px w-4 sm:w-6 ${current >= i ? 'bg-text-2' : 'bg-hairline'}`} aria-hidden="true" />}
            <span className="flex items-center gap-1.5">
              {done ? (
                <svg className="size-3.5 text-accent" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="7" fill="currentColor" opacity="0.15" />
                  <path d="M4.5 7.2l1.6 1.6 3.4-3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span
                  className={`size-2 rounded-full ${active ? 'bg-accent' : 'border border-muted'}`}
                  aria-hidden="true"
                />
              )}
              <span className={active ? 'font-semibold text-text' : done ? 'font-medium text-text-2' : 'font-medium text-muted'}>
                {step.label}
                <span className="sr-only">{done ? ' (concluída)' : active ? ' (em andamento)' : ' (pendente)'}</span>
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

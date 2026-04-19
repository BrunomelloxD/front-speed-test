import type { TestPhase } from '../types/speedTest';

interface PhaseIndicatorProps {
  phase: TestPhase;
}

const steps: { key: TestPhase; label: string }[] = [
  { key: 'ping', label: 'Ping' },
  { key: 'download', label: 'Download' },
  { key: 'upload', label: 'Upload' },
];

const phaseOrder: Record<TestPhase, number> = {
  idle: -1,
  ping: 0,
  download: 1,
  upload: 2,
  done: 3,
};

export function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  const current = phaseOrder[phase];

  if (phase === 'idle') return null;

  return (
    <div className="flex items-center gap-2 sm:gap-3" role="progressbar" aria-valuenow={current + 1} aria-valuemax={3}>
      {steps.map((step, i) => {
        const isDone = current > i;
        const isActive = current === i;

        return (
          <div key={step.key} className="flex items-center gap-2 sm:gap-3">
            {i > 0 && (
              <div className={`h-px w-6 sm:w-10 transition-colors duration-300 ${
                isDone ? 'bg-cyan-400' : 'bg-slate-700'
              }`} />
            )}
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                isDone
                  ? 'bg-cyan-400'
                  : isActive
                    ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                    : 'bg-slate-700'
              }`} />
              <span className={`text-xs font-medium transition-colors duration-300 ${
                isDone || isActive ? 'text-cyan-400' : 'text-slate-600'
              }`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}

      {phase === 'done' && (
        <>
          <div className="h-px w-6 sm:w-10 bg-emerald-400" />
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-medium text-emerald-400">Concluído</span>
          </div>
        </>
      )}
    </div>
  );
}

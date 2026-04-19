import type { TestPhase } from '../types/speedTest';

interface SpeedTestButtonProps {
  phase: TestPhase;
  onClick: () => void;
}

const phaseLabels: Record<TestPhase, string> = {
  idle: 'Iniciar Teste',
  ping: 'Medindo Ping...',
  download: 'Testando Download...',
  upload: 'Testando Upload...',
  done: 'Testar Novamente',
};

export function SpeedTestButton({ phase, onClick }: SpeedTestButtonProps) {
  const isRunning = phase !== 'idle' && phase !== 'done';

  return (
    <button
      onClick={onClick}
      disabled={isRunning}
      className={`
        relative px-10 py-4 rounded-full text-sm font-bold uppercase tracking-widest
        transition-all duration-300 outline-none
        focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
        ${isRunning
          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          : phase === 'done'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-400/50 cursor-pointer'
            : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] cursor-pointer active:scale-95'
        }
      `}
    >
      {isRunning && (
        <span className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping" />
      )}
      <span className="relative flex items-center gap-2">
        {isRunning && (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
          </svg>
        )}
        {phase === 'idle' && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
          </svg>
        )}
        {phaseLabels[phase]}
      </span>
    </button>
  );
}

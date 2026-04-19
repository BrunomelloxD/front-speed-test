import type { SpeedTestResult } from '../types/speedTest';

interface ResultCardProps {
  result: SpeedTestResult;
  onDelete?: (id: string) => void;
}

export function ResultCard({ result, onDelete }: ResultCardProps) {
  return (
    <div
      className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-lg"
      style={{ animation: 'fade-in-scale 0.4s ease-out' }}
    >
      <div className="flex justify-between items-center mb-5">
        <span className="text-xs text-slate-500 font-mono">
          {new Date(result.tested_at).toLocaleString('pt-BR')}
        </span>
        {onDelete && (
          <button
            onClick={() => {
              if (window.confirm('Excluir este resultado?')) onDelete(result.id);
            }}
            className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded-md
              focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 outline-none cursor-pointer"
            aria-label="Excluir resultado"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400 tabular-nums">{result.download_speed}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Download Mbps</p>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">{result.upload_speed}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Upload Mbps</p>
        </div>
      </div>

      <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-slate-700/50">
        <div className="text-center">
          <p className="text-sm font-semibold text-amber-400 tabular-nums">{result.ping} ms</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Ping</p>
        </div>
        {result.jitter !== null && (
          <div className="text-center">
            <p className="text-sm font-semibold text-orange-400 tabular-nums">{result.jitter} ms</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Jitter</p>
          </div>
        )}
      </div>
    </div>
  );
}

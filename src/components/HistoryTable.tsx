import type { SpeedTestResult } from '../types/speedTest';

interface HistoryTableProps {
  results: SpeedTestResult[];
  onDelete: (id: string) => void;
}

export function HistoryTable({ results, onDelete }: HistoryTableProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="w-16 h-16 mx-auto text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-slate-500 text-sm">Nenhum teste realizado ainda.</p>
        <p className="text-slate-600 text-xs mt-1">Execute um teste de velocidade para ver os resultados aqui.</p>
      </div>
    );
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este resultado?')) {
      onDelete(id);
    }
  };

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-slate-800/80 text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Download</th>
              <th className="px-4 py-3 font-medium">Upload</th>
              <th className="px-4 py-3 font-medium">Ping</th>
              <th className="px-4 py-3 font-medium">Jitter</th>
              <th className="px-4 py-3 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {results.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                  {new Date(r.tested_at).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  <span className="text-cyan-400 font-semibold tabular-nums">{r.download_speed}</span>
                  <span className="text-slate-600 text-xs ml-1">Mbps</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-emerald-400 font-semibold tabular-nums">{r.upload_speed}</span>
                  <span className="text-slate-600 text-xs ml-1">Mbps</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-amber-400 tabular-nums">{r.ping}</span>
                  <span className="text-slate-600 text-xs ml-1">ms</span>
                </td>
                <td className="px-4 py-3 text-slate-500 tabular-nums">{r.jitter ?? '—'} ms</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded
                      focus-visible:ring-2 focus-visible:ring-red-400 outline-none cursor-pointer"
                    aria-label="Excluir"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {results.map((r) => (
          <div
            key={r.id}
            className="bg-slate-800/40 rounded-xl p-4 border border-slate-800/50"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] text-slate-500 font-mono">
                {new Date(r.tested_at).toLocaleString('pt-BR')}
              </span>
              <button
                onClick={() => handleDelete(r.id)}
                className="text-slate-600 hover:text-red-400 transition-colors p-1 cursor-pointer"
                aria-label="Excluir"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-lg font-bold text-cyan-400 tabular-nums">{r.download_speed}</p>
                <p className="text-[10px] text-slate-500 uppercase">Download Mbps</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-400 tabular-nums">{r.upload_speed}</p>
                <p className="text-[10px] text-slate-500 uppercase">Upload Mbps</p>
              </div>
            </div>
            <div className="flex gap-6 mt-2 pt-2 border-t border-slate-700/30">
              <span className="text-xs text-amber-400 tabular-nums">{r.ping} ms <span className="text-slate-600">ping</span></span>
              <span className="text-xs text-slate-500 tabular-nums">{r.jitter ?? '—'} ms <span className="text-slate-600">jitter</span></span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function HistoryTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 bg-slate-800/40 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

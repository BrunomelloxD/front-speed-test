import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HistoryTable, HistoryTableSkeleton } from '../components/HistoryTable';
import { getResults, deleteResult } from '../api/speedTestApi';
import type { SpeedTestResult } from '../types/speedTest';

export function HistoryPage() {
  const [results, setResults] = useState<SpeedTestResult[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Loading starts in the event that triggers the fetch (page change, delete),
  // so the effect only sets state once the response arrives.
  useEffect(() => {
    let active = true;
    getResults(page, 15).then((response) => {
      if (!active) return;
      setResults(response.data);
      setPage(response.meta.page);
      setLastPage(response.meta.last_page);
      setTotal(response.meta.total);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [page, reloadKey]);

  const goToPage = (next: number) => {
    if (next === page) return;
    setLoading(true);
    setPage(next);
  };

  const handleDelete = async (id: string) => {
    await deleteResult(id);
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Histórico</h1>
            {!loading && (
              <p className="text-xs text-slate-500 mt-1">{total} teste{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</p>
            )}
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan-400 transition-colors
              focus-visible:ring-2 focus-visible:ring-cyan-400 outline-none rounded px-2 py-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Novo teste
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <HistoryTableSkeleton />
        ) : (
          <>
            <HistoryTable results={results} onDelete={handleDelete} />

            {lastPage > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => goToPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed
                    hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 outline-none"
                  aria-label="Página anterior"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="flex items-center gap-1 px-3">
                  {Array.from({ length: lastPage }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === lastPage || Math.abs(p - page) <= 1)
                    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1]) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...' ? (
                        <span key={`dots-${i}`} className="text-slate-600 px-1">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => goToPage(p)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors cursor-pointer
                            focus-visible:ring-2 focus-visible:ring-cyan-400 outline-none
                            ${p === page
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'text-slate-500 hover:text-white hover:bg-slate-800'
                            }`}
                        >
                          {p}
                        </button>
                      )
                  )}
                </div>

                <button
                  onClick={() => goToPage(Math.min(lastPage, page + 1))}
                  disabled={page >= lastPage}
                  className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed
                    hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 outline-none"
                  aria-label="Próxima página"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

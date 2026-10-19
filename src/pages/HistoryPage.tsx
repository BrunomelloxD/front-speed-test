import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { HistoryTable, HistoryTableSkeleton } from '../components/HistoryTable';
import { PillButton } from '../components/PillButton';
import { getResults, deleteResult } from '../api/speedTestApi';
import { restoreAt, withoutPending } from '../lib/ui/history';
import type { SpeedTestResult } from '../types/speedTest';

const UNDO_MS = 5000;

type Pending = {
  item: SpeedTestResult;
  index: number;
  timer: ReturnType<typeof setTimeout>;
  startedAt: number;
  remaining: number;
};

// Keyboard focus goes to the delete button now at `index` (the visible layout), else to the heading.
function focusRow(index: number, fallback: HTMLElement | null) {
  requestAnimationFrame(() => {
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('button[data-delete]')].filter((b) => b.offsetParent !== null);
    (buttons[Math.min(index, buttons.length - 1)] ?? fallback)?.focus();
  });
}

export function HistoryPage() {
  const [results, setResults] = useState<SpeedTestResult[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Loading starts in the event that triggers the fetch (page change, retry, delete),
  // so the effect only sets state once the response arrives.
  useEffect(() => {
    let active = true;
    getResults(page, 15)
      .then((response) => {
        if (!active) return;
        // A row waiting for "Desfazer" still exists on the server: keep it hidden.
        const pendingId = pendingRef.current?.item.id ?? null;
        const visible = withoutPending(response.data, pendingId);
        setResults(visible);
        setPage(response.meta.page);
        setLastPage(response.meta.last_page);
        setTotal(response.meta.total - (response.data.length - visible.length));
        setStatus('ready');
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [page, reloadKey]);

  // A deletion still waiting for "Desfazer" is committed when leaving the page.
  useEffect(
    () => () => {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timer);
        void deleteResult(pendingRef.current.item.id);
      }
    },
    [],
  );

  const reload = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };

  const goToPage = (next: number) => {
    if (next === page) return;
    setStatus('loading');
    setPage(next);
  };

  const commitDelete = (id: string) => {
    pendingRef.current = null;
    setPending(null);
    deleteResult(id).finally(reload);
  };

  const handleDelete = (id: string) => {
    const previous = pendingRef.current;
    if (previous) {
      clearTimeout(previous.timer);
      commitDelete(previous.item.id);
    }
    const index = results.findIndex((r) => r.id === id);
    if (index < 0) return;
    const item = results[index];
    const next: Pending = { item, index, timer: setTimeout(() => commitDelete(id), UNDO_MS), startedAt: Date.now(), remaining: UNDO_MS };
    pendingRef.current = next;
    setPending(next);
    setResults((list) => list.filter((r) => r.id !== id));
    setTotal((t) => t - 1);
    focusRow(index, headingRef.current);
  };

  // WCAG 2.2.1: the undo window pauses while the pointer or focus is on the notice.
  const pauseUndo = () => {
    const current = pendingRef.current;
    if (!current) return;
    clearTimeout(current.timer);
    current.remaining -= Date.now() - current.startedAt;
  };

  const resumeUndo = () => {
    const current = pendingRef.current;
    if (!current) return;
    clearTimeout(current.timer);
    current.startedAt = Date.now();
    current.timer = setTimeout(() => commitDelete(current.item.id), Math.max(current.remaining, 1000));
  };

  const undo = () => {
    const current = pendingRef.current;
    if (!current) return;
    clearTimeout(current.timer);
    pendingRef.current = null;
    setPending(null);
    const restored = restoreAt(results, current.item, current.index);
    if (restored === results) return;
    setResults(restored);
    setTotal((t) => t + 1);
    focusRow(current.index, headingRef.current);
  };

  const bestId = results.length ? results.reduce((best, r) => (r.download_speed > best.download_speed ? r : best)).id : null;

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-[1120px] px-4 pt-6 pb-28 sm:px-8 sm:pt-10 xl:px-0">
        <AppHeader link="home" />

        <main id="conteudo" tabIndex={-1} className="mt-10 outline-none sm:mt-14">
          <h1 ref={headingRef} tabIndex={-1} className="text-[30px] font-semibold tracking-tight text-balance outline-none sm:text-[40px]">
            Histórico
          </h1>
          <p className="mt-1.5 text-sm text-text-2 sm:text-[15px]" aria-live="polite">
            {status === 'ready' &&
              total > 0 &&
              `${total} teste${total === 1 ? '' : 's'} neste dispositivo · medidos até o servidor de teste (Railway)`}
          </p>

          <div className="mt-6 sm:mt-8">
            {status === 'loading' && <HistoryTableSkeleton />}

            {status === 'error' && (
              <div role="alert" className="rounded-[22px] border border-hairline bg-surface p-6 sm:p-8">
                <p className="text-lg font-semibold">Não foi possível carregar o histórico.</p>
                <p className="mt-1.5 text-sm text-text-2">O servidor de teste não respondeu. Seus resultados continuam salvos.</p>
                <div className="mt-6 sm:w-64">
                  <PillButton variant="secondary" icon="retry" onClick={reload}>
                    Tentar de novo
                  </PillButton>
                </div>
              </div>
            )}

            {status === 'ready' && results.length === 0 && (
              <div className="rounded-[22px] border border-hairline bg-surface p-8 text-center sm:p-12">
                <p className="text-lg font-semibold">Nenhum teste ainda.</p>
                <p className="mt-1.5 text-sm text-text-2">Os resultados aparecem aqui depois de cada medição.</p>
                <Link
                  to="/"
                  className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent px-6 text-[15px] font-semibold text-bg transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                >
                  Fazer o primeiro teste
                </Link>
              </div>
            )}

            {status === 'ready' && results.length > 0 && <HistoryTable results={results} bestId={bestId} onDelete={handleDelete} />}

            {status === 'ready' && lastPage > 1 && (
              <nav aria-label="Páginas do histórico" className="mt-6 flex items-center justify-center gap-2 font-mono text-sm">
                <button
                  type="button"
                  onClick={() => goToPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="min-h-11 cursor-pointer rounded-full border border-hairline px-4 text-text-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Anterior
                </button>
                <span className="px-3 text-text-2" aria-current="page">
                  {page} de {lastPage}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(Math.min(lastPage, page + 1))}
                  disabled={page >= lastPage}
                  className="min-h-11 cursor-pointer rounded-full border border-hairline px-4 text-text-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Próxima
                </button>
              </nav>
            )}
          </div>
        </main>
      </div>

      {/* Always mounted, so screen readers announce changes reliably. */}
      <p className="sr-only" aria-live="polite">
        {pending ? `Teste de ${new Date(pending.item.tested_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} excluído. Use Desfazer, no fim da página, para restaurar.` : ''}
      </p>

      {pending && (
        <div
          onMouseEnter={pauseUndo}
          onMouseLeave={resumeUndo}
          onFocus={pauseUndo}
          onBlur={resumeUndo}
          className="fixed inset-x-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] mx-auto flex max-w-sm items-center justify-between gap-4 rounded-full border border-hairline bg-surface py-2 pr-2 pl-6 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.6)] motion-safe:animate-[fade-up_300ms_var(--ease-instrument)_both]"
        >
          <p className="text-sm font-medium" aria-hidden="true">
            Teste de {new Date(pending.item.tested_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} excluído
          </p>
          <button
            type="button"
            onClick={undo}
            className="min-h-11 cursor-pointer rounded-full px-4 text-sm font-semibold text-accent hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-accent"
          >
            Desfazer
          </button>
        </div>
      )}
    </div>
  );
}

import { StatusBadge } from './MetricTile';
import { formatNumber } from '../lib/ui/format';
import type { SpeedTestResult } from '../types/speedTest';

interface HistoryTableProps {
  results: SpeedTestResult[];
  bestId: string | null;
  onDelete: (id: string) => void;
}

const when = (iso: string) => {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('pt-BR'),
    short: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
};

function DeleteButton({ result, onDelete }: { result: SpeedTestResult; onDelete: (id: string) => void }) {
  const { date, time } = when(result.tested_at);
  return (
    <button
      type="button"
      data-delete=""
      onClick={() => onDelete(result.id)}
      className="flex size-11 cursor-pointer items-center justify-center rounded-full text-text-2 transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-accent"
      aria-label={`Excluir teste de ${date} às ${time}`}
    >
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2.5 4.5h11 M6 4.5V3h4v1.5 M4 4.5l.7 8.5h6.6l.7-8.5" />
      </svg>
    </button>
  );
}

export function HistoryTable({ results, bestId, onDelete }: HistoryTableProps) {
  return (
    <div className="rounded-[28px] border border-hairline bg-shell p-1.5">
      <div className="rounded-[22px] bg-surface">
        {/* ≥ 640 px: table */}
        <table className="hidden w-full text-left sm:table">
          <caption className="sr-only">Testes anteriores, do mais recente para o mais antigo</caption>
          <thead>
            <tr className="border-b border-hairline text-[13px] text-text-2">
              <th scope="col" className="py-5 pl-7 font-medium">Data</th>
              <th scope="col" className="py-5 text-right font-medium">Download</th>
              <th scope="col" className="py-5 text-right font-medium">Upload</th>
              <th scope="col" className="py-5 text-right font-medium">Latência</th>
              <th scope="col" className="py-5 text-right font-medium">Jitter</th>
              <th scope="col" className="py-5 pr-5"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/4">
            {results.map((r) => {
              const { date, time } = when(r.tested_at);
              return (
                <tr key={r.id} className="transition-colors hover:bg-white/2">
                  <td className="py-3 pl-7 font-mono text-[15px]">
                    {date} <span className="ml-3 text-text-2">{time}</span>
                    {r.id === bestId && <span className="ml-4"><StatusBadge kind="best" /></span>}
                  </td>
                  <td className="py-3 text-right font-mono text-[17px] font-medium text-accent tabular-nums">{formatNumber(r.download_speed)}</td>
                  <td className="py-3 text-right font-mono text-[17px] font-medium text-upload tabular-nums">{formatNumber(r.upload_speed)}</td>
                  <td className="py-3 text-right font-mono text-[15px] tabular-nums">{formatNumber(r.ping)} ms</td>
                  <td className="py-3 text-right font-mono text-[15px] tabular-nums">{r.jitter === null ? '—' : `${formatNumber(r.jitter)} ms`}</td>
                  <td className="py-2 pr-4 text-right"><DeleteButton result={r} onDelete={onDelete} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* < 640 px: compact list */}
        <ul className="divide-y divide-white/4 px-5 sm:hidden">
          {results.map((r) => {
            const { short, time } = when(r.tested_at);
            return (
              <li key={r.id} className="py-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-3 font-mono text-[13px] text-text-2">
                    {short} · {time}
                    {r.id === bestId && <StatusBadge kind="best" />}
                  </span>
                  <DeleteButton result={r} onDelete={onDelete} />
                </div>
                <div className="mt-1 flex items-baseline gap-5 font-mono tabular-nums">
                  <span className="text-[22px] font-medium text-accent">
                    {formatNumber(r.download_speed)}<span className="ml-1 font-sans text-sm text-text-2" aria-hidden="true">↓</span><span className="sr-only"> Mbps de download</span>
                  </span>
                  <span className="text-[22px] font-medium text-upload">
                    {formatNumber(r.upload_speed)}<span className="ml-1 font-sans text-sm text-text-2" aria-hidden="true">↑</span><span className="sr-only"> Mbps de upload</span>
                  </span>
                  <span className="ml-auto text-[13px] text-text-2">{formatNumber(r.ping, 0)} ms</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function HistoryTableSkeleton() {
  return (
    <div className="space-y-3" role="status">
      <span className="sr-only">Carregando histórico…</span>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 rounded-2xl bg-surface motion-safe:animate-pulse" />
      ))}
    </div>
  );
}

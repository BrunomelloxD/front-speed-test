import { describeError } from '../lib/ui/errorMessage';
import { PillButton } from './PillButton';

export function ErrorPanel({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { title, cause, details } = describeError(error);

  return (
    <div role="alert" className="flex flex-col items-start">
      <span className="flex size-11 items-center justify-center rounded-full bg-danger/10 text-danger" aria-hidden="true">
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M8 3.5v5.5 M8 12v.5" />
        </svg>
      </span>
      <h2 className="mt-6 max-w-[16ch] text-[22px] leading-tight font-semibold tracking-tight text-balance sm:text-[30px]">{title}</h2>
      <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-text-2 sm:text-base">{cause}</p>
      <div className="mt-6 w-full sm:w-64">
        <PillButton variant="primary" icon="retry" onClick={onRetry}>
          Tentar de novo
        </PillButton>
      </div>
      <details className="group mt-6 w-full">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded text-sm font-medium text-text-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <svg viewBox="0 0 12 12" className="size-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path d="M4.5 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Detalhes técnicos
        </summary>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-hairline bg-black/20 p-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap text-text-2">
          {details}
        </pre>
      </details>
    </div>
  );
}

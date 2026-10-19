import type { ReactNode } from 'react';
import { AppHeader } from '../components/AppHeader';
import { ErrorPanel } from '../components/ErrorPanel';
import { Gauge } from '../components/Gauge';
import { MetricTile, StatusBadge, type MetricState } from '../components/MetricTile';
import { PhaseSparkline } from '../components/PhaseSparkline';
import { PillButton } from '../components/PillButton';
import { Stepper } from '../components/Stepper';
import { useSpeedTest } from '../hooks/useSpeedTest';
import { formatNumber } from '../lib/ui/format';

const PHASE_TITLE = {
  idle: ['Sua conexão até', 'o servidor de teste'],
  ping: ['Medindo', 'a latência'],
  download: ['Medindo', 'o download'],
  upload: ['Medindo', 'o upload'],
  done: ['Resultado', 'do teste'],
  error: ['O teste', 'não terminou'],
} as const;

const ANNOUNCE = {
  idle: '',
  ping: 'Medindo a latência.',
  download: 'Medindo o download.',
  upload: 'Medindo o upload.',
  done: 'Teste concluído.',
  error: 'O teste não terminou.',
} as const;

export function HomePage() {
  const test = useSpeedTest();
  const { phase, failure, series, durationMs } = test;

  const view = failure ? 'error' : phase;
  const running = !failure && (phase === 'ping' || phase === 'download' || phase === 'upload');
  const pingDone = phase === 'download' || phase === 'upload' || phase === 'done';

  const tileState = (key: 'download' | 'upload'): MetricState => {
    if (failure) return 'empty';
    if (key === 'download' ? test.downloadFinal : test.uploadFinal) return 'final';
    return phase === key && series[key].length > 0 ? 'live' : 'empty';
  };

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto max-w-[1120px] px-4 pt-6 pb-10 sm:px-8 sm:pt-10 xl:px-0">
        <AppHeader link="history" />
        <p className="sr-only" aria-live="polite">
          {view === 'done'
            ? `Teste concluído. Download ${formatNumber(test.downloadSpeed)} megabits por segundo, upload ${formatNumber(test.uploadSpeed)}, latência ${formatNumber(test.ping)} milissegundos.`
            : ANNOUNCE[view]}
        </p>

        <main id="conteudo" tabIndex={-1} className="mt-6 grid gap-4 outline-none lg:mt-8 lg:grid-cols-[640px_1fr] lg:gap-16">
          {/* Double-bezel instrument panel */}
          <section aria-label="Medição" className="rounded-[28px] border border-hairline bg-shell p-1.5 sm:rounded-[32px]">
            <div className="flex min-h-[456px] flex-col rounded-[22px] bg-surface p-5 sm:rounded-[26px] sm:p-8 lg:min-h-[686px]">
              {view === 'error' && (
                <>
                  <Stepper phase={phase} />
                  <div className="mt-8 sm:mt-12">
                    <ErrorPanel error={failure} onRetry={test.runTest} />
                  </div>
                </>
              )}
              {view === 'done' && <ResultView test={test} durationMs={durationMs} />}
              {view !== 'error' && view !== 'done' && <MeasureView test={test} durationMs={durationMs} />}
            </div>
          </section>

          <aside className={`flex flex-col gap-4 lg:pt-4 ${view === 'error' ? 'hidden lg:flex' : ''}`}>
            {/* Visible from lg; below it the panel speaks for itself, but the page still needs its h1. */}
            <h1 className="sr-only text-[34px] leading-[1.15] font-semibold tracking-tight text-balance lg:not-sr-only">
              {PHASE_TITLE[view][0]}
              <br />
              <span className="text-text-2">{PHASE_TITLE[view][1]}</span>
            </h1>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:mt-4">
              <MetricTile label="Download" value={test.downloadSpeed} unit="Mbps" state={tileState('download')} tone="accent" />
              <MetricTile label="Upload" value={test.uploadSpeed} unit="Mbps" state={tileState('upload')} tone="upload" />
              <MetricTile label="Latência" value={test.ping} unit="ms" state={pingDone && !failure ? 'final' : 'empty'} tone="neutral" />
              <MetricTile label="Jitter" value={test.jitter} unit="ms" state={pingDone && !failure ? 'final' : 'empty'} tone="neutral" />
            </div>

            {view !== 'error' && (
              <div className="mt-2 sm:mt-6">
                {running ? (
                  <PillButton variant="secondary" icon="stop" onClick={test.cancel}>
                    Cancelar teste
                  </PillButton>
                ) : (
                  <PillButton variant="primary" icon={phase === 'done' ? 'retry' : 'play'} onClick={test.runTest}>
                    {phase === 'done' ? 'Testar de novo' : 'Iniciar teste'}
                  </PillButton>
                )}
              </div>
            )}

            <AsideNote view={view} saveError={test.saveError} />
          </aside>
        </main>

        <footer className="mt-10 font-mono text-xs text-muted">
          Mbps decimal (bits ÷ 1.000.000) · servidor de teste: <span translate="no">Railway</span>
        </footer>
      </div>
    </div>
  );
}

type TestState = ReturnType<typeof useSpeedTest>;

function MeasureView({ test, durationMs }: { test: TestState; durationMs: number }) {
  const { phase } = test;
  const measuring = phase === 'download' || phase === 'upload';
  const tone = phase === 'upload' ? 'upload' : 'accent';
  const live = phase === 'download' ? test.downloadSpeed : phase === 'upload' ? test.uploadSpeed : null;
  const hasLive = measuring && test.series[phase].length > 0;
  const label = measuring ? `${phase === 'download' ? 'Download' : 'Upload'}: ${formatNumber(live)} Mbps, ao vivo` : 'Medidor parado';

  return (
    <>
      <Stepper phase={phase} />
      <div className="mt-4 sm:mt-8">
        <Gauge value={hasLive ? live : null} state={hasLive ? 'live' : 'idle'} tone={tone} label={label}>
          {phase === 'idle' && (
            <>
              <p className="text-lg font-semibold sm:text-[22px]">Pronto para medir</p>
              <p className="mt-1 text-[13px] text-text-2 sm:text-[15px]">~{Math.round((2 * durationMs + 4000) / 1000)}&nbsp;s · conexões paralelas</p>
            </>
          )}
          {phase === 'ping' && (
            <>
              <p className="text-[15px] font-medium text-text-2 sm:text-[17px]">Medindo latência</p>
              <p className="mt-1 text-[13px] text-text-2 sm:text-sm">11 amostras em sequência</p>
            </>
          )}
          {measuring && (
            <>
              <p className={`text-[15px] font-semibold sm:text-[17px] ${tone === 'accent' ? 'text-accent' : 'text-upload'}`}>
                {phase === 'download' ? 'Download' : 'Upload'}
              </p>
              <p className="mt-1 font-mono text-[34px] leading-none font-medium text-text-2 tabular-nums sm:text-[52px]">{formatNumber(hasLive ? live : null)}</p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-sm font-medium text-text-2">Mbps</span>
                <StatusBadge kind="live" tone={tone} />
              </div>
            </>
          )}
        </Gauge>
      </div>

      <div className="mt-auto pt-6">
        {measuring && <PhaseSparkline points={test.series[phase]} durationMs={durationMs} tone={tone} />}
        {phase === 'ping' && (
          <InfoBox title="Como medimos a latência">11 pedidos em sequência. O primeiro abre a conexão e é descartado.</InfoBox>
        )}
        {phase === 'idle' && (
          <InfoBox title="Como medimos">
            Conexões paralelas por {durationMs / 1000}&nbsp;s em cada sentido. Os 2&nbsp;s iniciais são descartados. Mede até o servidor de teste (Railway), não até o provedor.
          </InfoBox>
        )}
      </div>
    </>
  );
}

function ResultView({ test, durationMs }: { test: TestState; durationMs: number }) {
  const when = test.result ? new Date(test.result.tested_at) : new Date();
  const rows = [
    { key: 'download', label: 'Download', value: test.downloadSpeed, tone: 'accent' },
    { key: 'upload', label: 'Upload', value: test.uploadSpeed, tone: 'upload' },
  ] as const;

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <span className="hidden sm:block">
          <Stepper phase="done" />
        </span>
        <span className="text-sm font-semibold text-accent sm:hidden">Concluído</span>
        <time dateTime={when.toISOString()} className="font-mono text-xs text-text-2">
          {when.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
        </time>
      </div>
      <div className="mt-6 flex flex-1 flex-col divide-y divide-hairline sm:mt-10">
        {rows.map((row, i) => (
          <div
            key={row.key}
            className="flex flex-1 flex-col justify-center gap-4 py-5 motion-safe:animate-[fade-up_500ms_var(--ease-instrument)_both] sm:flex-row sm:items-center sm:justify-between"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div>
              <p className="flex items-center gap-2.5">
                <span className={`text-[15px] font-semibold sm:text-[17px] ${row.tone === 'accent' ? 'text-accent' : 'text-upload'}`}>{row.label}</span>
                <StatusBadge kind="final" tone={row.tone} />
              </p>
              <p className="mt-1 flex items-baseline gap-2.5">
                <span className="font-mono text-5xl font-medium tabular-nums sm:text-[72px]">{formatNumber(row.value)}</span>
                <span className="text-sm font-medium text-text-2 sm:text-lg">Mbps</span>
              </p>
            </div>
            <div className="w-full sm:w-[42%]">
              <PhaseSparkline points={test.series[row.key]} durationMs={durationMs} tone={row.tone} compact />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function InfoBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-shell p-4">
      <p className="text-[13px] font-semibold">{title}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-text-2">{children}</p>
    </div>
  );
}

function AsideNote({ view, saveError }: { view: keyof typeof PHASE_TITLE; saveError: string | null }) {
  if (view === 'done') {
    return (
      <p className={`text-sm leading-relaxed ${saveError ? 'text-danger' : 'text-text-2'}`} role={saveError ? 'status' : undefined}>
        {saveError ?? 'Salvo no histórico. Mede até o servidor de teste (Railway), não até o provedor.'}
      </p>
    );
  }
  const text = {
    idle: 'Sem resultados ainda. O último teste aparece aqui.',
    ping: 'Cancelar descarta as medições desta rodada.',
    download: 'Cancelar descarta as medições desta rodada.',
    upload: 'Cancelar descarta as medições desta rodada.',
    error: 'Nada foi medido nesta rodada.',
  }[view];
  return <p className="text-sm leading-relaxed text-text-2">{text}</p>;
}

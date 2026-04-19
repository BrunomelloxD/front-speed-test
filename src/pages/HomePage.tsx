import { SpeedGauge } from '../components/SpeedGauge';
import { SpeedTestButton } from '../components/SpeedTestButton';
import { PhaseIndicator } from '../components/PhaseIndicator';
import { ResultCard } from '../components/ResultCard';
import { useSpeedTest } from '../hooks/useSpeedTest';
import { Link } from 'react-router-dom';

export function HomePage() {
  const { phase, ping, jitter, downloadSpeed, uploadSpeed, result, error, runTest } = useSpeedTest();

  const gaugeMax = Math.max(100, Math.ceil(Math.max(downloadSpeed, uploadSpeed) / 50) * 50);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Speed Test</h1>
        </div>
        <p className="text-slate-500 text-sm mb-8">Teste a velocidade da sua conexão</p>

        {/* Phase indicator */}
        <div className="mb-8 h-6">
          <PhaseIndicator phase={phase} />
        </div>

        {/* Gauges */}
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 mb-8 w-full justify-center">
          <SpeedGauge value={downloadSpeed} max={gaugeMax} label="Download" color="cyan" active={phase === 'download'} />
          <SpeedGauge value={uploadSpeed} max={gaugeMax} label="Upload" color="green" active={phase === 'upload'} />
        </div>

        {/* Ping & Jitter */}
        <div className="flex gap-8 mb-8">
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-amber-400 tabular-nums">{ping.toFixed(1)}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Ping (ms)</span>
          </div>
          <div className="w-px bg-slate-800" />
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-orange-400 tabular-nums">{jitter.toFixed(1)}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Jitter (ms)</span>
          </div>
        </div>

        {/* Button */}
        <SpeedTestButton phase={phase} onClick={runTest} />

        {/* Error */}
        {error && (
          <div className="mt-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center max-w-sm">
            {error}
          </div>
        )}

        {/* Result card */}
        {result && (
          <div className="mt-8 w-full">
            <ResultCard result={result} />
          </div>
        )}

        {/* History link */}
        <Link
          to="/history"
          className="mt-8 text-sm text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-1.5
            focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 outline-none rounded px-2 py-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Ver histórico de testes
        </Link>
      </div>
    </div>
  );
}

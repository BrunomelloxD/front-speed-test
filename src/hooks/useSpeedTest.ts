import { useState, useCallback } from 'react';
import { pingServer, downloadWithProgress, uploadWithProgress, saveResult } from '../api/speedTestApi';
import type { SpeedTestResult, TestPhase } from '../types/speedTest';

function generateRandomPayload(sizeMB: number): Blob {
  const chunk = new Uint8Array(65536);
  crypto.getRandomValues(chunk);
  const totalSize = sizeMB * 1024 * 1024;
  const parts: BlobPart[] = [];
  for (let offset = 0; offset < totalSize; offset += chunk.length) {
    const len = Math.min(chunk.length, totalSize - offset);
    parts.push(len === chunk.length ? chunk.buffer : chunk.slice(0, len).buffer);
  }
  return new Blob(parts);
}

interface SpeedTestState {
  phase: TestPhase;
  ping: number;
  jitter: number;
  downloadSpeed: number;
  uploadSpeed: number;
  result: SpeedTestResult | null;
  error: string | null;
}

export function useSpeedTest() {
  const [state, setState] = useState<SpeedTestState>({
    phase: 'idle',
    ping: 0,
    jitter: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    result: null,
    error: null,
  });

  const runTest = useCallback(async () => {
    setState(prev => ({ ...prev, phase: 'ping', error: null, result: null, ping: 0, jitter: 0, downloadSpeed: 0, uploadSpeed: 0 }));

    try {
      // — Ping (10 amostras) —
      const pings: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await pingServer();
        pings.push(performance.now() - start);
      }
      const avgPing = pings.reduce((a, b) => a + b, 0) / pings.length;
      const jitter = Math.sqrt(pings.reduce((sum, p) => sum + (p - avgPing) ** 2, 0) / pings.length);

      setState(prev => ({ ...prev, ping: Math.round(avgPing * 100) / 100, jitter: Math.round(jitter * 100) / 100, phase: 'download' }));

      // — Download (25 MB, progresso em tempo real) —
      const dlSamples: number[] = [];
      const { totalBytes, durationMs: dlMs } = await downloadWithProgress(25, (speed) => {
        dlSamples.push(speed);
        const recent = dlSamples.slice(-5);
        const smoothed = recent.reduce((a, b) => a + b, 0) / recent.length;
        setState(prev => ({ ...prev, downloadSpeed: Math.round(smoothed * 100) / 100 }));
      });
      const avgDlSpeed = (totalBytes * 8) / ((dlMs / 1000) * 1_000_000);

      setState(prev => ({ ...prev, downloadSpeed: Math.round(avgDlSpeed * 100) / 100, phase: 'upload' }));

      // — Upload (10 MB random, progresso em tempo real) —
      const uploadPayload = generateRandomPayload(10);
      const ulSamples: number[] = [];
      const { durationMs: ulMs } = await uploadWithProgress(uploadPayload, (speed) => {
        ulSamples.push(speed);
        const recent = ulSamples.slice(-5);
        const smoothed = recent.reduce((a, b) => a + b, 0) / recent.length;
        setState(prev => ({ ...prev, uploadSpeed: Math.round(smoothed * 100) / 100 }));
      });
      const avgUlSpeed = (uploadPayload.size * 8) / ((ulMs / 1000) * 1_000_000);

      setState(prev => ({ ...prev, uploadSpeed: Math.round(avgUlSpeed * 100) / 100, phase: 'done' }));

      // — Salvar resultado —
      const result = await saveResult({
        download_speed: Math.round(avgDlSpeed * 100) / 100,
        upload_speed: Math.round(avgUlSpeed * 100) / 100,
        ping: Math.round(avgPing * 100) / 100,
        jitter: Math.round(jitter * 100) / 100,
      });

      setState(prev => ({ ...prev, result }));
    } catch (err) {
      setState(prev => ({ ...prev, phase: 'idle', error: err instanceof Error ? err.message : 'Erro desconhecido' }));
    }
  }, []);

  return { ...state, runTest };
}

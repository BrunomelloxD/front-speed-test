import { useState, useCallback, useEffect, useRef } from 'react';
import { saveResult } from '../api/speedTestApi';
import { API_BASE_URL } from '../config/apiBaseUrl';
import { parseMeasureConfig } from '../lib/measure/config';
import { runDownload, runPing, runUpload } from '../lib/measure/runners';
import { runSpeedTest, type SpeedTestRunners } from '../lib/measure/runSpeedTest';
import type { SeriesPoint } from '../lib/ui/sparkline';
import type { SpeedTestResult, TestPhase } from '../types/speedTest';

const config = parseMeasureConfig({
  VITE_TEST_CONNECTIONS: import.meta.env.VITE_TEST_CONNECTIONS,
  VITE_TEST_DURATION_S: import.meta.env.VITE_TEST_DURATION_S,
});
const fetchApi: typeof fetch = (input, init) => fetch(input, init);

const runners: SpeedTestRunners = {
  ping: (signal) => runPing({ baseUrl: API_BASE_URL, fetch: fetchApi, signal }),
  download: (onLive, signal) => runDownload({ baseUrl: API_BASE_URL, fetch: fetchApi, signal, config, onLive }),
  upload: (onLive, signal) => runUpload({ baseUrl: API_BASE_URL, fetch: fetchApi, signal, config, onLive }),
};

interface SpeedTestState {
  phase: TestPhase;
  ping: number;
  jitter: number;
  /** Partial while its phase runs, final afterwards (see downloadFinal/uploadFinal). */
  downloadSpeed: number;
  uploadSpeed: number;
  downloadFinal: boolean;
  uploadFinal: boolean;
  result: SpeedTestResult | null;
  error: string | null;
  /** The original error, for the plain-language error panel. */
  failure: unknown;
  saveError: string | null;
  /** Live rate samples per phase, `t` in ms since that phase started. */
  series: { download: SeriesPoint[]; upload: SeriesPoint[] };
}

const initialState: SpeedTestState = {
  phase: 'idle',
  ping: 0,
  jitter: 0,
  downloadSpeed: 0,
  uploadSpeed: 0,
  downloadFinal: false,
  uploadFinal: false,
  result: null,
  error: null,
  failure: null,
  saveError: null,
  series: { download: [], upload: [] },
};

export function useSpeedTest() {
  const [state, setState] = useState<SpeedTestState>(initialState);
  const controllerRef = useRef<AbortController | null>(null);
  const phaseStartRef = useRef(0);

  // Leaving the page aborts every in-flight measurement request.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const runTest = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ ...initialState, phase: 'ping' });

    try {
      const { saved, saveError } = await runSpeedTest({
        runners,
        save: saveResult,
        signal: controller.signal,
        onPhase: (phase) => {
          phaseStartRef.current = performance.now();
          setState((prev) => ({ ...prev, phase }));
        },
        onLive: (phase, mbps) => {
          const point = { t: performance.now() - phaseStartRef.current, mbps };
          setState((prev) => ({
            ...prev,
            [phase === 'download' ? 'downloadSpeed' : 'uploadSpeed']: mbps,
            series: { ...prev.series, [phase]: [...prev.series[phase], point] },
          }));
        },
        onFinal: (values) =>
          setState((prev) => ({
            ...prev,
            ping: values.ping ?? prev.ping,
            jitter: values.jitter ?? prev.jitter,
            downloadSpeed: values.download_speed ?? prev.downloadSpeed,
            uploadSpeed: values.upload_speed ?? prev.uploadSpeed,
            downloadFinal: prev.downloadFinal || values.download_speed !== undefined,
            uploadFinal: prev.uploadFinal || values.upload_speed !== undefined,
          })),
      });
      setState((prev) => ({ ...prev, result: saved, saveError }));
    } catch (err) {
      if (controller.signal.aborted) return;
      setState((prev) => ({
        ...initialState,
        phase: prev.phase,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
        failure: err,
      }));
    }
  }, []);

  /** Aborts every in-flight request and returns to idle without an error. */
  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState(initialState);
  }, []);

  return { ...state, durationMs: config.durationMs, runTest, cancel };
}

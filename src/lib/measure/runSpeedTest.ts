import type { PhaseResult } from './runners.ts';

export type MeasuredPhase = 'ping' | 'download' | 'upload' | 'done';

export type SpeedTestValues = {
  download_speed: number;
  upload_speed: number;
  ping: number;
  jitter: number;
};

/** The three measurements, already bound to the API base URL, fetch and config. */
export type SpeedTestRunners = {
  ping: (signal?: AbortSignal) => Promise<{ latency: number; jitter: number }>;
  download: (onLive: (mbps: number) => void, signal?: AbortSignal) => Promise<PhaseResult>;
  upload: (onLive: (mbps: number) => void, signal?: AbortSignal) => Promise<PhaseResult>;
};

export const SAVE_ERROR_MESSAGE = 'Resultado medido, mas não foi salvo no histórico.';

const round2 = (value: number) => Math.round(value * 100) / 100;

/** ping → download → upload → save. A failed save keeps the measurement (SAVE-01). */
export async function runSpeedTest<Saved>({
  runners,
  save,
  signal,
  onPhase,
  onLive,
  onFinal,
}: {
  runners: SpeedTestRunners;
  save: (values: SpeedTestValues) => Promise<Saved>;
  signal?: AbortSignal;
  onPhase?: (phase: MeasuredPhase) => void;
  onLive?: (phase: 'download' | 'upload', mbps: number) => void;
  onFinal?: (values: Partial<SpeedTestValues>) => void;
}): Promise<{ result: SpeedTestValues; saved: Saved | null; saveError: string | null }> {
  onPhase?.('ping');
  const { latency, jitter } = await runners.ping(signal);
  onFinal?.({ ping: round2(latency), jitter: round2(jitter) });

  onPhase?.('download');
  const download = await runners.download((mbps) => onLive?.('download', mbps), signal);
  onFinal?.({ download_speed: round2(download.mbps) });

  onPhase?.('upload');
  const upload = await runners.upload((mbps) => onLive?.('upload', mbps), signal);
  onFinal?.({ upload_speed: round2(upload.mbps) });

  const result: SpeedTestValues = {
    download_speed: round2(download.mbps),
    upload_speed: round2(upload.mbps),
    ping: round2(latency),
    jitter: round2(jitter),
  };

  let saved: Saved | null = null;
  let saveError: string | null = null;
  try {
    saved = await save(result);
  } catch {
    saveError = SAVE_ERROR_MESSAGE;
  }

  onPhase?.('done');
  return { result, saved, saveError };
}

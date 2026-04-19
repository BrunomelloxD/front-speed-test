import axios from 'axios';
import type { SpeedTestResult, PaginatedResponse } from '../types/speedTest';

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/speed-tests`
  : '/api/speed-tests';

const api = axios.create({ baseURL });

export async function pingServer(): Promise<{ pong: boolean; timestamp: number }> {
  const { data } = await api.get('/ping');
  return data;
}

export function downloadWithProgress(
  sizeMb: number,
  onProgress: (speedMbps: number) => void,
): Promise<{ totalBytes: number; durationMs: number }> {
  const startTime = performance.now();
  let lastLoaded = 0;
  let lastTime = startTime;

  return api
    .get(`/download?size=${sizeMb}`, {
      responseType: 'blob',
      onDownloadProgress: (event) => {
        const now = performance.now();
        const intervalMs = now - lastTime;
        if (intervalMs >= 100 && event.loaded > lastLoaded) {
          const bytes = event.loaded - lastLoaded;
          const seconds = intervalMs / 1000;
          const speedMbps = (bytes * 8) / (seconds * 1_000_000);
          onProgress(speedMbps);
          lastLoaded = event.loaded;
          lastTime = now;
        }
      },
    })
    .then(({ data }) => ({
      totalBytes: data.size,
      durationMs: performance.now() - startTime,
    }));
}

export function uploadWithProgress(
  blob: Blob,
  onProgress: (speedMbps: number) => void,
): Promise<{ durationMs: number }> {
  const startTime = performance.now();
  let lastLoaded = 0;
  let lastTime = startTime;

  return api
    .post('/upload', blob, {
      headers: { 'Content-Type': 'application/octet-stream' },
      onUploadProgress: (event) => {
        const now = performance.now();
        const intervalMs = now - lastTime;
        if (intervalMs >= 100 && event.loaded > lastLoaded) {
          const bytes = event.loaded - lastLoaded;
          const seconds = intervalMs / 1000;
          const speedMbps = (bytes * 8) / (seconds * 1_000_000);
          onProgress(speedMbps);
          lastLoaded = event.loaded;
          lastTime = now;
        }
      },
    })
    .then(() => ({
      durationMs: performance.now() - startTime,
    }));
}

export async function saveResult(result: Pick<SpeedTestResult, 'download_speed' | 'upload_speed' | 'ping' | 'jitter'>): Promise<SpeedTestResult> {
  const { data } = await api.post('', result);
  return data;
}

export async function getResults(page = 1, limit = 10): Promise<PaginatedResponse<SpeedTestResult>> {
  const { data } = await api.get('', { params: { page, limit } });
  return data;
}

export async function deleteResult(id: string): Promise<void> {
  await api.delete(`/${id}`);
}

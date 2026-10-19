import axios from 'axios';
import type { SpeedTestResult, PaginatedResponse } from '../types/speedTest';
import { API_BASE_URL } from '../config/apiBaseUrl.ts';

export const api = axios.create({ baseURL: API_BASE_URL });

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

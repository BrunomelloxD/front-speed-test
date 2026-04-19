export interface SpeedTestResult {
  id: string;
  download_speed: number;
  upload_speed: number;
  ping: number;
  jitter: number | null;
  ip_address: string | null;
  isp: string | null;
  server_location: string | null;
  tested_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    last_page: number;
  };
}

export type TestPhase = 'idle' | 'ping' | 'download' | 'upload' | 'done';

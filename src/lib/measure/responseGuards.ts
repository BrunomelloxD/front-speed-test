// Every measurement response is checked before it becomes a number on screen, so a
// misrouted request (e.g. the front's SPA fallback returning index.html) fails loudly.

export class InvalidApiResponseError extends Error {
  endpoint: string;
  expected: string;
  received: string;

  constructor(endpoint: string, expected: string, received: string) {
    super(
      `A API de teste respondeu algo inesperado em ${endpoint}: esperado ${expected}, recebido ${received}. ` +
        'Confira se VITE_API_URL aponta para a API.',
    );
    this.name = 'InvalidApiResponseError';
    this.endpoint = endpoint;
    this.expected = expected;
    this.received = received;
  }
}

function describeValue(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value) ?? String(value);
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

function field(body: unknown, key: string): unknown {
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[key] : undefined;
}

export function assertPong(body: unknown): void {
  if (field(body, 'pong') !== true) {
    throw new InvalidApiResponseError('/ping', 'JSON com pong: true', describeValue(body));
  }
}

export function assertDownloadResponse(res: Response, requestedBytes: number): void {
  const type = res.headers.get('content-type') ?? '';
  const length = res.headers.get('content-length');
  if (res.status !== 200 || !type.startsWith('application/octet-stream') || length !== String(requestedBytes)) {
    throw new InvalidApiResponseError(
      '/download',
      `200 application/octet-stream com ${requestedBytes} bytes`,
      `${res.status} ${type || 'sem Content-Type'} com ${length ?? 'sem'} Content-Length`,
    );
  }
}

export function assertUploadAck(body: unknown, sentBytes: number): void {
  if (field(body, 'size') !== sentBytes) {
    throw new InvalidApiResponseError('/upload', `JSON com size: ${sentBytes}`, describeValue(body));
  }
}

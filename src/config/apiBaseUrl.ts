// Single place that reads VITE_API_URL and builds the API base path (AD-001).
// Also imported by vite.config.ts, so it must stay free of browser-only code.

export const PRODUCTION_API_ORIGIN = 'https://api-speed-test-production.up.railway.app';

const API_PATH = '/api/speed-tests';
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i;
const HAS_PROTOCOL = /^[a-z][a-z\d+.-]*:\/\//i;

export class InvalidApiUrlError extends Error {
  value: string;

  constructor(value: string) {
    super(
      `VITE_API_URL inválida: "${value}". Use a origem da API, por exemplo ` +
        `${PRODUCTION_API_ORIGIN} (o protocolo é opcional; não inclua /speed-tests, query ou #).`,
    );
    this.name = 'InvalidApiUrlError';
    this.value = value;
  }
}

/**
 * Turns VITE_API_URL into the speed-test base URL.
 * - Without protocol: https://, or http:// for localhost/127.0.0.1/[::1].
 * - Missing: the Vite proxy in dev, production in build.
 */
export function resolveApiBaseUrl(raw: string | undefined, { mode }: { mode: 'dev' | 'build' }): string {
  const value = raw?.trim() ?? '';

  if (value === '') {
    return mode === 'build' ? `${PRODUCTION_API_ORIGIN}${API_PATH}` : API_PATH;
  }

  if (/\s/.test(value) || value.includes('?') || value.includes('#')) {
    throw new InvalidApiUrlError(value);
  }

  const withProtocol = HAS_PROTOCOL.test(value)
    ? value
    : `${LOCAL_HOST.test(value) ? 'http' : 'https'}://${value}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new InvalidApiUrlError(value);
  }

  const path = url.pathname.replace(/\/+$/, '');
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || (path !== '' && path !== '/api')) {
    throw new InvalidApiUrlError(value);
  }

  return `${url.origin}${API_PATH}`;
}

// import.meta.env is undefined under node:test, hence the optional chaining.
export const API_BASE_URL = resolveApiBaseUrl(import.meta.env?.VITE_API_URL, {
  mode: import.meta.env?.PROD ? 'build' : 'dev',
});

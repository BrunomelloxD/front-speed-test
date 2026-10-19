import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { InvalidApiUrlError, resolveApiBaseUrl } from './apiBaseUrl.ts';

const PROD_BASE = 'https://api-speed-test-production.up.railway.app/api/speed-tests';
const build = (raw: string | undefined) => resolveApiBaseUrl(raw, { mode: 'build' });
const dev = (raw: string | undefined) => resolveApiBaseUrl(raw, { mode: 'dev' });

describe('resolveApiBaseUrl', () => {
  test('URL-01: appends /api/speed-tests to an origin with protocol', () => {
    assert.equal(build('https://api.exemplo.com'), 'https://api.exemplo.com/api/speed-tests');
  });

  test('URL-02: tolerates a trailing /, /api or /api/ without duplicating /api', () => {
    for (const raw of ['https://api.exemplo.com/', 'https://api.exemplo.com/api', 'https://api.exemplo.com/api/']) {
      assert.equal(build(raw), 'https://api.exemplo.com/api/speed-tests', raw);
    }
  });

  test('edge: ignores surrounding whitespace', () => {
    assert.equal(build('  https://api.exemplo.com  '), 'https://api.exemplo.com/api/speed-tests');
  });

  test('edge: lowercases the host', () => {
    assert.equal(build('https://API.Exemplo.com'), 'https://api.exemplo.com/api/speed-tests');
  });

  test('URL-03: assumes https for a non-local host without protocol (the Railway value)', () => {
    assert.equal(build('api-speed-test-production.up.railway.app'), PROD_BASE);
  });

  test('URL-04: assumes http for localhost, 127.0.0.1 and [::1], with or without port', () => {
    assert.equal(build('localhost:3000'), 'http://localhost:3000/api/speed-tests');
    assert.equal(build('localhost'), 'http://localhost/api/speed-tests');
    assert.equal(build('127.0.0.1:3000'), 'http://127.0.0.1:3000/api/speed-tests');
    assert.equal(build('[::1]:3000'), 'http://[::1]:3000/api/speed-tests');
  });

  test('URL-04: keeps an explicit http protocol and port', () => {
    assert.equal(build('http://localhost:3000'), 'http://localhost:3000/api/speed-tests');
  });

  describe('URL-05: rejects invalid values with a clear message', () => {
    for (const raw of ['ftp://x.com', 'api exemplo.com', 'https://x.com/v1', 'https://x.com/?a=1', 'https://x.com/#a']) {
      test(raw, () => {
        assert.throws(
          () => build(raw),
          (error: unknown) => {
            assert.ok(error instanceof InvalidApiUrlError);
            assert.match(error.message, new RegExp(raw.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')));
            assert.match(error.message, /https:\/\/api-speed-test-production\.up\.railway\.app/);
            return true;
          },
        );
      });
    }
  });

  test('URL-07: a build without VITE_API_URL targets production', () => {
    assert.equal(build(undefined), PROD_BASE);
    assert.equal(build(''), PROD_BASE);
    assert.equal(build('   '), PROD_BASE);
  });

  test('URL-08: dev without VITE_API_URL goes through the Vite proxy', () => {
    assert.equal(dev(undefined), '/api/speed-tests');
    assert.equal(dev(''), '/api/speed-tests');
  });

  test('URL-08: dev with VITE_API_URL still uses it', () => {
    assert.equal(dev('localhost:3000'), 'http://localhost:3000/api/speed-tests');
  });
});

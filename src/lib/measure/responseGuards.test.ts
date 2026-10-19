import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertDownloadResponse,
  assertPong,
  assertUploadAck,
  InvalidApiResponseError,
} from './responseGuards.ts';

const HTML = '<!doctype html><html lang="pt-BR"><head>';

function rejects(fn: () => void, endpoint: string) {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof InvalidApiResponseError);
    // VAL-04: endpoint, expected, received and the hint about VITE_API_URL.
    assert.equal(error.endpoint, endpoint);
    assert.match(error.message, new RegExp(endpoint));
    assert.match(error.message, /esperado/);
    assert.match(error.message, /recebido/);
    assert.match(error.message, /VITE_API_URL/);
    return true;
  });
}

const octet = (headers: Record<string, string>, status = 200) => new Response(null, { status, headers });

describe('assertPong (VAL-01)', () => {
  test('accepts { pong: true }', () => {
    assert.doesNotThrow(() => assertPong({ pong: true, timestamp: 1 }));
  });

  for (const [label, body] of [
    ['HTML from the front', HTML],
    ['empty object', {}],
    ['pong as string', { pong: 'true' }],
    ['null', null],
  ] as const) {
    test(`rejects ${label}`, () => rejects(() => assertPong(body), '/ping'));
  }

  test('VAL-04: the message shows what was received', () => {
    assert.throws(() => assertPong(HTML), /<!doctype html>/);
  });
});

describe('assertDownloadResponse (VAL-02)', () => {
  test('accepts 200 octet-stream with the requested Content-Length', () => {
    assert.doesNotThrow(() =>
      assertDownloadResponse(octet({ 'content-type': 'application/octet-stream', 'content-length': '25000000' }), 25_000_000),
    );
  });

  test('rejects a non-200 status', () => {
    rejects(
      () => assertDownloadResponse(octet({ 'content-type': 'application/octet-stream', 'content-length': '10' }, 206), 10),
      '/download',
    );
  });

  test('rejects text/html (the SPA fallback)', () => {
    rejects(
      () => assertDownloadResponse(octet({ 'content-type': 'text/html; charset=utf-8', 'content-length': '607' }), 25_000_000),
      '/download',
    );
  });

  test('rejects a missing Content-Length', () => {
    rejects(() => assertDownloadResponse(octet({ 'content-type': 'application/octet-stream' }), 25_000_000), '/download');
  });

  test('rejects a Content-Length different from the request', () => {
    rejects(
      () => assertDownloadResponse(octet({ 'content-type': 'application/octet-stream', 'content-length': '10000000' }), 25_000_000),
      '/download',
    );
  });
});

describe('assertUploadAck (VAL-03)', () => {
  test('accepts the exact size sent', () => {
    assert.doesNotThrow(() => assertUploadAck({ size: 250_000, timestamp: 1 }, 250_000));
  });

  test('rejects a different size', () => rejects(() => assertUploadAck({ size: 0 }, 250_000), '/upload'));
  test('rejects a non-object body', () => rejects(() => assertUploadAck(HTML, 250_000), '/upload'));
  test('rejects null', () => rejects(() => assertUploadAck(null, 250_000), '/upload'));
});

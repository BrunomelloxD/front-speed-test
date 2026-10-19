import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { api } from './speedTestApi.ts';
import { API_BASE_URL } from '../config/apiBaseUrl.ts';

test('URL-09: the CRUD client uses the single API base URL', () => {
  assert.equal(api.defaults.baseURL, API_BASE_URL);
});

test('URL-09: only src/config/apiBaseUrl.ts reads VITE_API_URL from the env', () => {
  const src = new URL('..', import.meta.url).pathname;
  const files = (function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  })(src);
  const readers = files
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .filter((file) => /env\??\.VITE_API_URL/.test(readFileSync(file, 'utf8')))
    .map((file) => file.slice(src.length));

  assert.deepEqual(readers, ['config/apiBaseUrl.ts']);
});

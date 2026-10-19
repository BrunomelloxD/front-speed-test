// Temporary: proves the node:test setup runs TypeScript. Removed when the first real test lands (T11).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const double = (value: number): number => value * 2;

test('node:test runs TypeScript test files', () => {
  assert.equal(double(21), 42);
});

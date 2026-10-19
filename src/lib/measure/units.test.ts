import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMbps } from './units.ts';

test('MEAS-05: Mbps = bytes × 8 / seconds / 1e6 (decimal)', () => {
  assert.equal(toMbps(1_000_000, 1000), 8);
  assert.equal(toMbps(12_500_000, 1000), 100);
  assert.equal(toMbps(25_000_000, 500), 400);
});

test('MEAS-05: a non-positive duration yields 0 instead of Infinity or a negative rate', () => {
  assert.equal(toMbps(1_000_000, 0), 0);
  assert.equal(toMbps(1_000_000, -1), 0);
});

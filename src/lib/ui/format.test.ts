import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber } from './format.ts';

test('UI-06: one decimal with a decimal comma', () => {
  assert.equal(formatNumber(382.5), '382,5');
  assert.equal(formatNumber(6.66), '6,7');
  assert.equal(formatNumber(0), '0,0');
  assert.equal(formatNumber(1234.5), '1234,5');
});

test('UI-06: honours the digits argument', () => {
  assert.equal(formatNumber(212.64, 2), '212,64');
  assert.equal(formatNumber(212.6, 0), '213');
});

test('UI-06: a missing value shows an em dash', () => {
  assert.equal(formatNumber(null), '—');
  assert.equal(formatNumber(Number.NaN), '—');
});

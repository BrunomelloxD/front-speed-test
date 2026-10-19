import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMeasureConfig } from './config.ts';

test('MEAS-09: defaults when nothing is configured', () => {
  assert.deepEqual(parseMeasureConfig({}), { connections: 6, durationMs: 12_000, warmupMs: 2000, sampleMs: 200 });
});

test('MEAS-09: connections are clamped to 4–8 and fall back to 6 when not numeric', () => {
  assert.equal(parseMeasureConfig({ VITE_TEST_CONNECTIONS: '2' }).connections, 4);
  assert.equal(parseMeasureConfig({ VITE_TEST_CONNECTIONS: '9' }).connections, 8);
  assert.equal(parseMeasureConfig({ VITE_TEST_CONNECTIONS: '5' }).connections, 5);
  assert.equal(parseMeasureConfig({ VITE_TEST_CONNECTIONS: 'abc' }).connections, 6);
  assert.equal(parseMeasureConfig({ VITE_TEST_CONNECTIONS: '' }).connections, 6);
});

test('MEAS-09: duration is clamped to 10–15 s and falls back to 12 s when not numeric', () => {
  assert.equal(parseMeasureConfig({ VITE_TEST_DURATION_S: '5' }).durationMs, 10_000);
  assert.equal(parseMeasureConfig({ VITE_TEST_DURATION_S: '30' }).durationMs, 15_000);
  assert.equal(parseMeasureConfig({ VITE_TEST_DURATION_S: '14' }).durationMs, 14_000);
  assert.equal(parseMeasureConfig({ VITE_TEST_DURATION_S: '' }).durationMs, 12_000);
  assert.equal(parseMeasureConfig({ VITE_TEST_DURATION_S: 'x' }).durationMs, 12_000);
});

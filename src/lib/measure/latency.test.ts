import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pingStats } from './latency.ts';

test('PING-01/02/03: drops the first sample, median latency, mean consecutive-difference jitter', () => {
  const { latency, jitter } = pingStats([50, 10, 12, 11, 13, 10, 12, 11, 14, 10, 12]);

  assert.equal(latency, 11.5);
  assert.ok(Math.abs(jitter - 20 / 9) < 1e-12, `jitter ${jitter}`);
});

test('PING-02: odd count after the drop uses the middle value', () => {
  assert.equal(pingStats([99, 30, 10, 20]).latency, 20);
});

test('PING-01: the first (cold connection) sample never affects the result', () => {
  assert.deepEqual(pingStats([1000, 10, 10]), pingStats([1, 10, 10]));
});

test('PING-03: fewer than 2 samples after the drop yields jitter 0', () => {
  assert.deepEqual(pingStats([80, 12]), { latency: 12, jitter: 0 });
});

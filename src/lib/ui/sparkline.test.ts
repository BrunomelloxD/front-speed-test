import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sparklinePath } from './sparkline.ts';

test('UI-07: the warm-up band covers the first 2 s of the phase', () => {
  assert.equal(sparklinePath([], 600, 90, 12_000).warmupWidth, 100);
  assert.equal(sparklinePath([], 300, 60, 10_000).warmupWidth, 60);
});

test('UI-07: x follows elapsed time, y is inverted and scaled to 115% of the peak', () => {
  const { d, last } = sparklinePath(
    [
      { t: 0, mbps: 0 },
      { t: 6000, mbps: 100 },
    ],
    600,
    100,
    12_000,
    0,
  );
  // peak 100 → top of the scale is 115, so 100 Mbps sits at 100 - 100 * (100/115)
  assert.equal(d, 'M 0.0 100.0 L 300.0 13.0');
  assert.equal(last?.x, 300);
  assert.ok(Math.abs((last?.y ?? 0) - (100 - (100 * 100) / 115)) < 1e-9);
});

test('UI-07: padding keeps the line off the edges', () => {
  const { d } = sparklinePath([{ t: 0, mbps: 0 }, { t: 12_000, mbps: 50 }], 600, 100, 12_000, 6);
  assert.match(d, /^M 0\.0 94\.0 L 600\.0 /);
});

test('no samples gives an empty path', () => {
  assert.deepEqual(sparklinePath([], 600, 90, 12_000), { d: '', warmupWidth: 100, last: null });
});

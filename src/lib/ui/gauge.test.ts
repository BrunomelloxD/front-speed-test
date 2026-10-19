import { test } from 'node:test';
import assert from 'node:assert/strict';
import { angleFor, arcPath, GAUGE, GAUGE_TICKS, polar } from './gauge.ts';

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('UI-01: log scale from 1 to 1000 Mbps over 240 degrees', () => {
  close(angleFor(1), -120);
  close(angleFor(1000), 120);
  close(angleFor(10 ** 1.5), 0);
  close(angleFor(0.5), -120);
  close(angleFor(5000), 120);
});

test('UI-03: ticks are fixed', () => {
  assert.deepEqual(GAUGE_TICKS, [1, 10, 50, 100, 250, 500, 1000]);
});

test('UI-02: the whole arc and every tick label stay inside the viewBox', () => {
  const { width, height, cx, cy, r, labelRadius } = GAUGE;
  const margin = 12; // half of the widest label ("1000") at 11 px
  for (let a = -120; a <= 120; a += 5) {
    const p = polar(cx, cy, r + 7, a);
    assert.ok(p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height, `arc point ${a}`);
  }
  for (const tick of GAUGE_TICKS) {
    const p = polar(cx, cy, labelRadius, angleFor(tick));
    assert.ok(p.x - margin >= 0 && p.x + margin <= width && p.y - margin >= 0 && p.y + margin <= height, `label ${tick}`);
  }
});

test('polar measures clockwise from 12 o’clock', () => {
  const top = polar(100, 100, 50, 0);
  close(top.x, 100);
  close(top.y, 50);
  const right = polar(100, 100, 50, 90);
  close(right.x, 150);
  close(right.y, 100);
});

test('arcPath uses the large-arc flag only above 180 degrees', () => {
  assert.match(arcPath(100, 100, 50, -120, 120), / 0 1 1 /);
  assert.match(arcPath(100, 100, 50, -120, 0), / 0 0 1 /);
});

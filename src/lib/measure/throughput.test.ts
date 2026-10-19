import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmedSeries, liveMbps, stableMbps, type Sample } from './throughput.ts';

// Cumulative series sampled every 200 ms from piecewise-constant byte rates.
function series(segments: { untilMs: number; bytesPerSecond: number }[]): Sample[] {
  const samples: Sample[] = [{ t: 0, bytes: 0 }];
  let bytes = 0;
  let from = 0;
  for (const { untilMs, bytesPerSecond } of segments) {
    for (let t = from + 200; t <= untilMs; t += 200) {
      bytes += (bytesPerSecond * 200) / 1000;
      samples.push({ t, bytes });
    }
    from = untilMs;
  }
  return samples;
}

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

describe('stableMbps', () => {
  test('MEAS-03: ignores the first 2 s (slow start) and measures the rest', () => {
    const samples = series([
      { untilMs: 2000, bytesPerSecond: 1_000_000 },
      { untilMs: 12_000, bytesPerSecond: 10_000_000 },
    ]);

    close(stableMbps(samples, 2000), 80);

    const last = samples[samples.length - 1];
    const wholeAverage = (last.bytes * 8) / (last.t / 1000) / 1e6;
    assert.ok(wholeAverage < 80, 'the plain average would understate the link');
  });

  test('MEAS-04: a phase shorter than warm-up + 1 s uses the whole window', () => {
    const samples = series([
      { untilMs: 2000, bytesPerSecond: 1_000_000 },
      { untilMs: 2400, bytesPerSecond: 10_000_000 },
    ]);
    // 2e6 + 4e6 bytes in 2.4 s = 20 Mbps (the post-warm-up slice alone would read 80).
    close(stableMbps(samples, 2000), 20);
  });

  test('MEAS-04: exactly warm-up + 1 s still uses the stable window', () => {
    const samples = series([
      { untilMs: 2000, bytesPerSecond: 1_000_000 },
      { untilMs: 3000, bytesPerSecond: 10_000_000 },
    ]);
    close(stableMbps(samples, 2000), 80);
  });

  test('returns 0 without at least two samples', () => {
    assert.equal(stableMbps([], 2000), 0);
    assert.equal(stableMbps([{ t: 0, bytes: 0 }], 2000), 0);
  });
});

describe('liveMbps', () => {
  test('MEAS-08: reflects only the last 1000 ms', () => {
    const samples = series([
      { untilMs: 1000, bytesPerSecond: 100_000_000 },
      { untilMs: 3000, bytesPerSecond: 1_000_000 },
    ]);
    close(liveMbps(samples), 8);
  });

  test('MEAS-08: before 1000 ms it uses what exists so far', () => {
    const samples = series([{ untilMs: 600, bytesPerSecond: 5_000_000 }]);
    close(liveMbps(samples), 40);
  });

  test('returns 0 without at least two samples', () => {
    assert.equal(liveMbps([{ t: 0, bytes: 0 }]), 0);
  });
});

describe('confirmedSeries', () => {
  test('MEAS-07: spreads a confirmed request linearly between its start and end', () => {
    const result = confirmedSeries([{ start: 0, end: 1000, bytes: 1_000_000 }], [0, 500, 1000, 1500]);
    assert.deepEqual(
      result.map((s) => s.bytes),
      [0, 500_000, 1_000_000, 1_000_000],
    );
    assert.deepEqual(
      result.map((s) => s.t),
      [0, 500, 1000, 1500],
    );
  });

  test('MEAS-07: overlapping requests add up', () => {
    const result = confirmedSeries(
      [
        { start: 0, end: 1000, bytes: 1_000_000 },
        { start: 500, end: 1500, bytes: 1_000_000 },
      ],
      [1000],
    );
    assert.equal(result[0].bytes, 1_500_000);
  });

  test('MEAS-07: no confirmed requests means no bytes', () => {
    assert.deepEqual(
      confirmedSeries([], [0, 200, 400]).map((s) => s.bytes),
      [0, 0, 0],
    );
  });
});

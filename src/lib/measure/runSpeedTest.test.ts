import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { runSpeedTest, SAVE_ERROR_MESSAGE, type SpeedTestRunners } from './runSpeedTest.ts';
import type { PhaseResult } from './runners.ts';

const phase = (mbps: number): PhaseResult => ({ mbps, bytes: 1, samples: [] });

function runners(overrides: Partial<SpeedTestRunners> = {}) {
  const calls: string[] = [];
  const base: SpeedTestRunners = {
    ping: async () => {
      calls.push('ping');
      return { latency: 12.3456, jitter: 1.98765 };
    },
    download: async (onLive) => {
      calls.push('download');
      onLive(321);
      return phase(387.654321);
    },
    upload: async (onLive) => {
      calls.push('upload');
      onLive(123);
      return phase(374.005);
    },
  };
  return { runners: { ...base, ...overrides }, calls };
}

describe('runSpeedTest', () => {
  test('runs ping → download → upload → done and reports live and final values', async () => {
    const phases: string[] = [];
    const live: [string, number][] = [];
    const { runners: r } = runners();

    const outcome = await runSpeedTest({
      runners: r,
      save: async (values) => ({ id: '1', ...values }),
      onPhase: (p) => phases.push(p),
      onLive: (p, mbps) => live.push([p, mbps]),
    });

    assert.deepEqual(phases, ['ping', 'download', 'upload', 'done']);
    assert.deepEqual(live, [
      ['download', 321],
      ['upload', 123],
    ]);
    assert.deepEqual(outcome.result, { ping: 12.35, jitter: 1.99, download_speed: 387.65, upload_speed: 374.01 });
    assert.equal(outcome.saveError, null);
  });

  test('saves the final values rounded to 2 decimals', async () => {
    let saved: unknown;
    const { runners: r } = runners();

    await runSpeedTest({ runners: r, save: async (values) => ((saved = values), values) });

    assert.deepEqual(saved, { download_speed: 387.65, upload_speed: 374.01, ping: 12.35, jitter: 1.99 });
  });

  test('SAVE-01: a failed save keeps the result and reports saveError', async () => {
    const phases: string[] = [];
    const { runners: r } = runners();

    const outcome = await runSpeedTest({
      runners: r,
      save: async () => {
        throw new Error('500');
      },
      onPhase: (p) => phases.push(p),
    });

    assert.equal(SAVE_ERROR_MESSAGE, 'Resultado medido, mas não foi salvo no histórico.');
    assert.equal(outcome.saveError, SAVE_ERROR_MESSAGE);
    assert.deepEqual(outcome.result, { ping: 12.35, jitter: 1.99, download_speed: 387.65, upload_speed: 374.01 });
    assert.equal(phases.at(-1), 'done');
  });

  test('a download failure stops the test before upload and save', async () => {
    let saveCalled = false;
    const { runners: r, calls } = runners({
      download: async () => {
        throw new Error('rede caiu');
      },
    });

    await assert.rejects(
      runSpeedTest({ runners: r, save: async (v) => ((saveCalled = true), v) }),
      /rede caiu/,
    );

    assert.deepEqual(calls, ['ping']);
    assert.equal(saveCalled, false);
  });
});

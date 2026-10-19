import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreAt, withoutPending } from './history.ts';

const a = { id: 'a' };
const b = { id: 'b' };
const c = { id: 'c' };

test('UI-18: a reload never brings back the row waiting for "Desfazer"', () => {
  assert.deepEqual(withoutPending([a, b, c], 'b'), [a, c]);
  assert.deepEqual(withoutPending([a, c], 'b'), [a, c]);
  assert.deepEqual(withoutPending([a, b], null), [a, b]);
});

test('UI-18: undo puts the row back where it was', () => {
  assert.deepEqual(restoreAt([a, c], b, 1), [a, b, c]);
  assert.deepEqual(restoreAt([a, c], b, 0), [b, a, c]);
});

test('UI-18: undo after the list shrank appends at the end', () => {
  assert.deepEqual(restoreAt([a], c, 5), [a, c]);
});

test('UI-18: undo never duplicates a row that is already listed', () => {
  assert.deepEqual(restoreAt([a, b, c], b, 0), [a, b, c]);
});

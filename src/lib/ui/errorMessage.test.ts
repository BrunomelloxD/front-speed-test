import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeError } from './errorMessage.ts';
import { InvalidApiResponseError } from '../measure/responseGuards.ts';

const SERVER_TITLE = 'Não foi possível falar com o servidor de teste';

test('UI-11: a response that is not the test API', () => {
  const error = new InvalidApiResponseError('/ping', 'JSON com pong: true', '<!doctype html>');
  assert.deepEqual(describeError(error), {
    title: SERVER_TITLE,
    cause: 'O endereço configurado respondeu algo que não é a API de teste. Nenhum valor foi medido.',
    details: error.message,
  });
});

test('UI-12: a network failure from fetch', () => {
  const result = describeError(new TypeError('Failed to fetch'));
  assert.equal(result.title, SERVER_TITLE);
  assert.equal(result.cause, 'Sem resposta do servidor de teste. Confira sua conexão e tente de novo.');
  assert.equal(result.details, 'TypeError: Failed to fetch');
});

test('UI-13: any other error keeps the original text in the details', () => {
  const result = describeError(new Error('rede caiu'));
  assert.equal(result.title, 'O teste não terminou');
  assert.equal(result.details, 'Error: rede caiu');
});

test('UI-13: non-Error values are described too', () => {
  const result = describeError('boom');
  assert.equal(result.title, 'O teste não terminou');
  assert.equal(result.details, 'boom');
});

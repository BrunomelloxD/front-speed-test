import { InvalidApiResponseError } from '../measure/responseGuards.ts';

export type ErrorDescription = { title: string; cause: string; details: string };

const SERVER_TITLE = 'Não foi possível falar com o servidor de teste';

/** Plain-language message for the error panel; the original text goes to "Detalhes técnicos". */
export function describeError(error: unknown): ErrorDescription {
  if (error instanceof InvalidApiResponseError) {
    return {
      title: SERVER_TITLE,
      cause: 'O endereço configurado respondeu algo que não é a API de teste. Nenhum valor foi medido.',
      details: error.message,
    };
  }
  const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (error instanceof TypeError) {
    return { title: SERVER_TITLE, cause: 'Sem resposta do servidor de teste. Confira sua conexão e tente de novo.', details };
  }
  return { title: 'O teste não terminou', cause: 'Algo falhou no meio da medição. Nenhum valor foi salvo.', details };
}

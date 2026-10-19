# Speed Test (front)

Front em Vite + React que mede latência, download e upload contra a API `api-speed-test` (NestJS) e salva o resultado no histórico.

## O que o número significa

O teste mede a banda **entre o seu navegador e a instância da API no Railway**. Ele não mede até o seu provedor. O resultado é limitado por:

- a região onde a API roda e a distância até ela;
- a banda de saída e a CPU da instância no Railway;
- a borda do Railway, que fala HTTP/2: as conexões paralelas viram streams numa mesma conexão TCP.

Por isso, o valor pode ficar abaixo do speed.cloudflare.com ou do Speedtest da Ookla, que usam servidores perto de você. Se o resultado parar sempre no mesmo patamar, o teto provavelmente é o servidor.

## Método

| Fase | Como mede |
| --- | --- |
| Ping | 11 requisições `GET /ping` em sequência. A primeira (DNS, TCP, TLS) é descartada. Latência = mediana das 10 restantes. Jitter = média das diferenças entre amostras consecutivas. |
| Download | `VITE_TEST_CONNECTIONS` requisições paralelas de 25.000.000 bytes, repetidas até `VITE_TEST_DURATION_S`. Conta os bytes lidos do stream, inclusive os de requisições cortadas no fim da fase. |
| Upload | Mesmo paralelismo e duração. Cada conexão começa com 250.000 bytes e dobra enquanto a requisição leva menos de 500 ms, até 16.000.000. Só contam os bytes que o servidor confirmou (`size` na resposta). |

Em download e upload, os **primeiros 2 s são descartados** (slow start do TCP). O resultado é calculado sobre a janela estável. Durante a fase, a tela mostra a taxa parcial do último segundo. O valor final só aparece quando a fase termina.

Unidade: **Mbps decimal**, `bytes × 8 / segundos / 1.000.000`.

Toda resposta é validada antes de virar número. O ping exige `{ pong: true }`, o download exige `application/octet-stream` com o `Content-Length` pedido e o upload exige `size` igual ao enviado. Uma resposta de outro servidor (por exemplo, o `index.html` do próprio front) para o teste com erro.

## Configuração

Copie `.env.example` para `.env`.

| Variável | Valor | Padrão |
| --- | --- | --- |
| `VITE_API_URL` | Origem da API. Protocolo opcional: sem protocolo vira `https://`, ou `http://` para `localhost`. O front acrescenta `/api/speed-tests`. | `npm run dev`: proxy `/api` → `http://localhost:3000`. `npm run build`: produção. |
| `VITE_TEST_CONNECTIONS` | Conexões paralelas, de 4 a 8 | 6 |
| `VITE_TEST_DURATION_S` | Duração de cada fase em segundos, de 10 a 15 | 12 |

Produção (Railway): `VITE_API_URL=api-speed-test-production.up.railway.app` (ou com `https://`). Valor inválido (outro protocolo, caminho, query, `#`, espaço) faz o `npm run build` falhar com a mensagem do formato esperado.

As variáveis são lidas no build. Depois de mudar o valor, é preciso gerar um novo build.

## Desenvolvimento

Requer Node 24 (`.nvmrc`), que roda os testes em TypeScript sem dependência extra.

```bash
nvm use
npm install
npm run dev     # http://localhost:5173, com a API em http://localhost:3000
npm test        # testes unitários (node:test)
npm run lint
npm run build
```

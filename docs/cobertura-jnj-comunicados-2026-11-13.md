# Calendário JNJ com comunicados da empresa — 13/11/2026

## Causa confirmada

Consultas públicas reais à Nasdaq para KO, JNJ e NU retornam identidade NYSE e calendário sem `dividends.rows`. Remover a exigência de listagem Nasdaq não produz calendário. A validação existente permanece.

O RI JNJ direto retornou HTTP 403 ao coletor. O feed público por símbolo na Nasdaq respondeu HTTP 200 e descobriu três comunicados JNJ publicados a partir do Business Wire. Não há proxy, credencial, falsificação de navegador ou consumo de API paga.

## Implementação local

Novo adapter `jnjAnnouncements`, usado em qualquer carteira que contenha JNJ. A descoberta automática considera até 100 entradas e no máximo cinco comunicados de dividendos dentro de 366 dias. Valida título, vínculo `jnj|stocks`, URL restrita, data de publicação, identificação NYSE:JNJ, origem Johnson & Johnson e link Business Wire com mesma data. Não aceita um texto solto de outra empresa.

O parser exige valor por ação, pagamento, registro e **data ex explícita** no corpo. Não deduz ex a partir de registro. Reconhece anúncio trimestral e aumento anual, escolhendo o novo valor trimestral, sem usar taxa anualizada.

Migration `20261113202456_jnj_primary_calendar.sql` amplia os dois pontos existentes de reconciliação/finish para JNJ, preserva conflitos e leases e continua restrita a service_role. Nenhum recebimento pessoal é criado. A proteção contra conflito econômico continua ativa.

## Consulta real gratuita

| Declaração | Ex e registro | Pagamento | USD/ação |
| --- | --- | --- | ---: |
| 14/04/2026 | 26/05/2026 | 09/06/2026 | 1,34 |
| 15/07/2026 | 25/08/2026 | 08/09/2026 | 1,34 |
| 13/10/2026 | 24/11/2026 | 08/12/2026 | 1,34 |

Fontes: [comunicado de abril](https://www.nasdaq.com/press-release/johnson-johnson-announces-64th-consecutive-year-dividend-increase-raises-quarterly), [julho](https://www.nasdaq.com/press-release/johnson-johnson-announces-quarterly-dividend-third-quarter-2026-2026-07-15), [outubro](https://www.nasdaq.com/press-release/johnson-johnson-announces-quarterly-dividend-fourth-quarter-2026-2026-10-13).

Consulta somente leitura de produção mostrou fevereiro, maio e agosto já cadastrados; novembro/dezembro ainda ausente. A integração consegue descobrir esse anúncio futuro sem aguardar as cotas pagas. Não houve aplicação da migration, publicação de função ou gravação financeira em produção nesta investigação.

## Testes e publicação

- 233 testes de proventos aprovados, incluindo rejeição de identidade/origem, data inválida, calendário incompleto, duplicação e roteamento com lease.
- TypeScript e lint do código Node aprovados; parser TS coberto pela importação dos testes. Secret scan sem achados nos arquivos rastreados.
- 18 baterias SQL aprovadas no banco **isolado** `valora-provider-qa`: fonte, ex explícita, lease obrigatória/liberada, idempotência, conflito econômico e ausência de alteração em recebimentos.
- Probe JNJ incluído na PR; teste SQL incluído no replay de CI.
- Replay integral de todas as migrations, incluindo JNJ, aprovado no projeto QA isolado (porta 55432). Treze testes Deno de identidade/OIDC e `deno check` da função/parser aprovados.

Após aprovação da PR: aplicar migration e publicar `sync-international-announcements` com a nova allowlist antes do reteste do runner. Conferir registro futuro JNJ, auditoria e liberação da lease; conservar snapshots dos outros fornecedores. Não precisa de chave nova.

O feed limitado não garante arquivo histórico completo; não extrapola pagamentos que não foram anunciados. KO/NU e demais lacunas continuam separados. Alpha/CR continua aguardando renovação de cota às 21h Brasília.

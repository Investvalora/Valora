---
title: 'Story 2.6 — Lista de alertas, badge e geração on-demand'
type: 'feature'
created: '2026-09-10'
status: 'done'
baseline_commit: 'bbaedd9746c7200746bfb7b4ddb41ed03e24feaa'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-5-importar-transacoes-csv.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A carteira ainda não informa inconsistências de dados nem oferece uma lista acionável de alertas. A geração precisa ser manual e idempotente, sem criar duplicatas ou acessar dados de outro usuário.

**Approach:** Criar a fundação persistida de alertas, uma Edge Function autenticada para gerar os alertas de posição sem transações e cotação desatualizada, e a experiência protegida de lista, badge e ações de leitura/ignoramento. O alerta de dividendo esperado não recebido fica explicitamente diferido para o Épico 3, quando existir a tabela `dividends`.

## Boundaries & Constraints

**Always:** tabela `alerts` com RLS por `user_id = auth.uid()`; status `novo | lido | ignorado`; tipos `position_no_transactions` e `stale_quote`; idempotência por usuário + tipo + ticker enquanto o alerta não estiver `ignorado`; geração on-demand somente para o usuário do JWT; lista cronológica; badge conta apenas `novo`; ações de marcar lido e ignorar; invalidar `['alerts', userId]` após mutações; cotação antiga significa último `price_history.date` com mais de 7 dias; sem notificações externas.

**Ask First:** mudar a regra de idempotência, permitir geração para outro usuário, ou incluir o alerta de dividendos sem uma fonte persistida de dividendos.

**Never:** aceitar `user_id` do body da Edge Function, usar service role sem restringir o usuário autenticado, gerar alerta de dividendo a partir de transações de provento, duplicar alertas ativos, ou usar Realtime como substituto da invalidação após ações do próprio usuário.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|----------------------------|----------------|
| Posição manual | Posição sem transações | Alerta `position_no_transactions` novo | Não duplicar em nova geração |
| Cotação antiga | Último preço com mais de 7 dias | Alerta `stale_quote` com ticker e data | Sem alerta se não houver posição |
| Geração repetida | Mesmo usuário e dados | Mantém uma ocorrência por tipo+ticker | Idempotência no banco |
| Ação de usuário | Alerta novo/lido | Pode marcar lido ou ignorado | RLS impede outra conta |
| Sem inconsistências | Carteira regular | Geração retorna sucesso sem criar alerta | Falha da função não esconde a lista |
| Usuário anônimo | JWT ausente/inválido | Nenhuma leitura ou geração | HTTP 401 |

</frozen-after-approval>

## Code Map

- `src/routes.tsx` -- placeholder protegido de `/alertas` e ponto de entrada da tela real.
- `src/shared/components/Layout.tsx` -- menu lateral que precisa exibir badge de alertas novos.
- `src/modules/portfolio/hooks/usePositions.ts` -- padrão de query autenticada e chave TanStack Query.
- `src/modules/portfolio/hooks/useImportTransactions.ts` -- padrão de mutation e invalidação após sucesso.
- `src/modules/portfolio/services/positionService.ts` -- encapsulamento de consultas Supabase e limite de carteira.
- `src/modules/portfolio/types.ts` -- tipos de posição e cotação reutilizados na exibição.
- `src/shared/services/supabaseClient.ts` -- cliente frontend; não deve receber service role.
- `supabase/migrations/006_create_positions.sql` e `007_create_transactions.sql` -- RLS, grants, índices e relações existentes.
- `supabase/functions/README.md` e `supabase/functions/*` -- padrão de Edge Functions e configuração de JWT a respeitar.
- `supabase/tests/run-rls-tests.mjs` -- runner que deve aplicar a nova migration e seus testes.
- `_bmad-output/implementation-artifacts/epic-2-context.md` -- contrato vigente e decisão de adiar dividendos para o Épico 3.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/008_create_alerts.sql` -- criar enum/tabela `alerts`, constraints, índices, RLS, policies e grants -- persistir alertas isolados por usuário.
- [x] `supabase/functions/generate-alerts/index.ts` e configuração -- gerar os dois tipos do MVP usando o JWT, com upsert/idempotência e resposta JSON -- impedir acesso cross-user.
- [x] `supabase/tests/021_alerts_rls_test.sql` e `supabase/tests/run-rls-tests.mjs` -- provar RLS, grants, idempotência e regras de geração -- manter o gate de banco executável.
- [x] `src/modules/alerts/types.ts`, `services/alertsService.ts` e `hooks/*` -- listar alertas, contar novos, gerar e atualizar status -- seguir TanStack Query e invalidar cache.
- [x] `src/modules/alerts/components/AlertsPage.tsx` e `src/routes.tsx` -- substituir placeholder por lista cronológica, estados vazios/erro/loading e ações -- tornar o fluxo acessível.
- [x] `src/shared/components/Layout.tsx` -- carregar badge de alertas novos -- manter navegação global atualizada.
- [x] `src/modules/alerts/**/__tests__/*` -- cobrir geração, badge, status, falha e isolamento no cliente -- provar a matriz de comportamento.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- registrar o alerta de dividendo como trabalho dependente do Épico 3 -- evitar implementação sem fonte de dados.

**Acceptance Criteria:**
- Dado um usuário autenticado com posição sem transações, quando gerar alertas, então existe um alerta `position_no_transactions` para o ticker, sem duplicata em nova execução.
- Dado um usuário autenticado com cotação acima de 7 dias, quando gerar alertas, então existe um alerta `stale_quote` com descrição e data da última cotação.
- Dado um alerta `novo`, quando o usuário o marca como lido ou ignorado, então o status é atualizado e o badge é recalculado.
- Dado um usuário B, quando consulta ou altera alertas de A, então não vê linhas e a escrita é rejeitada por RLS.
- Dado JWT ausente ou inválido, quando chama a Edge Function, então recebe 401 e nenhum alerta é criado.
- Dado o alerta de dividendos, quando a geração roda nesta story, então nenhum falso positivo é criado; a dependência fica registrada para o Épico 3.

## Verification

**Commands:**
- `pnpm test:rls` -- expected: migrations e testes de alertas passam no Postgres efêmero.
- `pnpm test:run` -- expected: testes de alertas e regressão passam.
- `pnpm lint` -- expected: sem erros novos nos arquivos da story.
- `pnpm build` -- expected: TypeScript e Vite compilam; erros preexistentes devem ser reportados separadamente.

## Suggested Review Order

**Geração server-side e segurança**

- A Edge Function autentica o JWT e gera candidatos somente para a carteira do usuário.
  [index.ts:61](../../supabase/functions/generate-alerts/index.ts#L61)

- A lógica determina posição sem transações e cotação acima de sete dias.
  [logic.ts:13](../../supabase/functions/generate-alerts/logic.ts#L13)

- A migration aplica status, RLS, grants e unicidade dos alertas ativos.
  [008_create_alerts.sql:6](../../supabase/migrations/008_create_alerts.sql#L6)

**Experiência de alertas**

- A tela apresenta estados, geração on-demand e ações de status.
  [AlertsPage.tsx:30](../../src/modules/alerts/components/AlertsPage.tsx#L30)

- O service exige uma linha afetada ao atualizar status, respeitando RLS.
  [alertsService.ts:35](../../src/modules/alerts/services/alertsService.ts#L35)

- O menu consulta e mostra somente a contagem de alertas novos.
  [Layout.tsx:18](../../src/shared/components/Layout.tsx#L18)

- A rota protege a tela de alertas dentro do layout autenticado.
  [routes.tsx:43](../../src/routes.tsx#L43)

**Provas**

- Os testes cobrem candidatos de geração, lista e atualização de status.
  [alertGeneration.test.ts:1](../../src/modules/alerts/alertGeneration.test.ts#L1)

- O teste SQL cobre RLS, grants e idempotência no banco.
  [021_alerts_rls_test.sql:1](../../supabase/tests/021_alerts_rls_test.sql#L1)
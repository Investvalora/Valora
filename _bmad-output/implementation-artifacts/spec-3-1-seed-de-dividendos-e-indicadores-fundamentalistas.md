---
title: 'Story 3.1 — Seed de Dividendos e Indicadores Fundamentalistas'
type: 'feature'
created: '2026-09-10'
status: 'done'
baseline_commit: '36ed496a6c15e02c38e8b5c21c427ce62abb86bb'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Valora-2026-08-15/ARCHITECTURE-SPINE.md'

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** As telas de proventos, score e preço-teto dependem de dados de dividendos e indicadores fundamentalistas, mas o banco ainda não possui essas tabelas nem dados iniciais para os ativos catalogados.

**Approach:** Criar as tabelas públicas de mercado e ampliar o seed local com histórico trimestral simulado, rastreável como `source = 'seed'`, idempotente e vinculado ao catálogo existente de `assets`.

## Boundaries & Constraints

**Always:** A migration deve ser posterior à 008; `dividends` terá `ticker`, `ex_date`, `payment_date` opcional, `value_per_share`, `type`, `source` e timestamps; `fundamentals` terá `ticker`, `reference_date`, `pl`, `pvp`, `roe`, `dy`, `debt_equity`, `net_margin`, `lpa`, `vpa`, `source` e `updated_at`; ambas terão FK para `assets(ticker)`, índices por ticker/data, unicidade por ativo e período e RLS habilitado. Usuários autenticados podem fazer SELECT; `anon` não recebe acesso; somente `service_role` pode inserir, atualizar ou remover. O seed deve ser determinístico, idempotente, depender de `assets`, marcar todas as linhas como `seed`, usar períodos trimestrais passados e não inserir dividendos com valor zero.

**Ask First:** Alterar o contrato para incluir dividendos futuros, outra periodicidade, novos indicadores ou permitir escrita por usuários autenticados.

**Never:** Remover RLS por serem tabelas de mercado, expor service role no frontend, inserir ticker sem ativo correspondente, usar dados aleatórios não reprodutíveis ou substituir o seed por chamada de rede.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|----------------------------|----------------|
| Catálogo completo | `assets` seed já aplicado | Todas as linhas seed são inseridas nas duas tabelas | Migration falha claramente se FK não puder ser satisfeita |
| Reexecução | Mesmo seed executado novamente | Nenhuma duplicata; valores permanecem consistentes | Upsert usa as chaves únicas |
| Ativo ausente | Registro de seed referencia ticker inexistente | Nenhuma linha órfã é criada | FK rejeita a operação |
| Acesso autenticado | Role `authenticated` consulta as tabelas | Leitura permitida, escrita bloqueada | SQLSTATE de privilégio esperado |
| Acesso anônimo | Role `anon` tenta consultar ou modificar | Nenhum acesso às tabelas | Grant/revoke e RLS bloqueiam a operação |

</frozen-after-approval>

## Code Map

- `supabase/migrations/008_create_alerts.sql` -- migration mais recente; a nova migration deve seguir sua ordem, grants e padrão de RLS.
- `supabase/migrations/003_create_assets_price_history.sql` -- contrato de `assets`, política de leitura autenticada, escrita restrita e FK de dados de mercado.
- `supabase/migrations/004_harden_default_privileges.sql` -- default privileges que tornam obrigatório revogar escrita e TRUNCATE para roles públicas.
- `supabase/migrations/009_create_dividends_and_fundamentals.sql` -- criar tabelas, constraints, índices, grants e policies do seed de mercado.
- `supabase/seed.sql` -- seed determinístico do catálogo; ampliar com linhas trimestrais de `dividends` e `fundamentals` após os ativos.
- `supabase/tests/000_stub_supabase.sql` -- roles, `auth.uid()`, extensões e defaults necessários ao teste efêmero.
- `supabase/tests/run-rls-tests.mjs` -- registrar e aplicar a migration nova no harness de RLS.
- `supabase/tests/030_market_seed_rls_test.sql` -- provar leitura autenticada, ausência de acesso anônimo e bloqueio de escrita sem service role, além das constraints do seed.
- `supabase/migrations/README.md` -- documentar a migration 009, a dependência de `assets` e os testes associados.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/009_create_dividends_and_fundamentals.sql` -- criar schema, FKs, constraints, índices, RLS e grants -- estabelecer o contrato persistido e impedir escrita indevida.
- [x] `supabase/seed.sql` -- adicionar dados trimestrais determinísticos para dividendos e fundamentals -- disponibilizar dados válidos para as telas futuras sem rede.
- [x] `supabase/tests/run-rls-tests.mjs` -- aplicar a migration 009 no harness -- garantir que o teste execute a mesma ordem do banco.
- [x] `supabase/tests/030_market_seed_rls_test.sql` -- testar políticas, idempotência e constraints -- provar a matriz de acesso e qualidade do seed.
- [x] `supabase/migrations/README.md` -- registrar a migration e sua verificação -- manter o procedimento operacional sincronizado.

**Acceptance Criteria:**
- Given `assets` seed aplicado, when a migration e o seed são executados, then `dividends` contém histórico trimestral simulado com `ex_date`, `payment_date`, `value_per_share`, `type` e `source = 'seed'`.
- Given `assets` seed aplicado, when o seed de fundamentals é executado, then cada registro contém `pl`, `pvp`, `roe`, `dy`, `debt_equity`, `net_margin`, `lpa`, `vpa` e `source = 'seed'`.
- Given o seed executado duas vezes, when a segunda execução termina, then não há duplicatas nem mudança não determinística nos registros.
- Given uma sessão `authenticated`, when consulta as tabelas, then lê dados; quando tenta escrever, then recebe bloqueio de privilégio/RLS.
- Given uma sessão `anon`, when consulta ou modifica as tabelas, then não possui acesso concedido.
- Given um ticker que não existe em `assets`, when um registro é inserido, then a FK rejeita a operação.

## Spec Change Log

## Verification

**Commands:**
- `pnpm test:rls` -- expected: harness aplica 009 e todas as asserções de RLS/constraints passam.
- `pnpm lint` -- expected: sem erros nos arquivos alterados.
- `pnpm build` -- expected: projeto compila sem regressões.

**Manual checks (if no CLI):**
- Consultar `information_schema`, `pg_policies` e `supabase_migrations.schema_migrations` para confirmar as duas tabelas, RLS, policies e registro da migration 009.

## Suggested Review Order

**Contrato de dados e seed**

- A migration define tabelas, constraints, RLS e grants para dados de mercado.
  [`009_create_dividends_and_fundamentals.sql:1`](../../supabase/migrations/009_create_dividends_and_fundamentals.sql#L1)

- O seed gera quatro trimestres determinísticos e preserva fontes externas.
  [`seed.sql:72`](../../supabase/seed.sql#L72)

**Verificação e operação**

- O harness aplica a migration 009, seed e asserções no Postgres efêmero.
  [`run-rls-tests.mjs:45`](../../supabase/tests/run-rls-tests.mjs#L45)

- Os testes cobrem leitura autenticada, bloqueios de escrita, FKs e idempotência.
  [`030_market_seed_rls_test.sql:1`](../../supabase/tests/030_market_seed_rls_test.sql#L1)

- A documentação registra a ordem da migration e o escopo do harness.
  [`README.md:103`](../../supabase/migrations/README.md#L103)
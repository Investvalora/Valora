---
title: 'Story 2.2 — Adicionar Posição Manual'
type: 'feature'
created: '2026-09-08'
status: 'done'
baseline_commit: '6ba9670277bbfe08df4a96d7ecf0d0f9405c8267'
review_loop_iteration: 1
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Carteira é um placeholder inline (`src/routes.tsx:12`) e a tabela `positions` não existe no banco. O usuário autenticado não tem como registrar o que possui, então o Épico 2 não tem dado de entrada.

**Approach:** Migration `006` cria `positions` com RLS; o módulo `src/modules/portfolio/` substitui o placeholder por uma Carteira real com modal "Adicionar Posição" validado contra o catálogo de `assets`. Escrita e leitura diretas na tabela, sem recálculo server-side.

## Boundaries & Constraints

**Always:**
- Tabela nova = RLS habilitada + policy por operação em `auth.uid() = user_id` + `REVOKE ALL ... FROM anon, authenticated` antes de `GRANT ... TO authenticated`. `anon` sem grant algum, `service_role` nunca nomeado (AD-6).
- Estilo de migration da `003`: comentários em português, `BEGIN;`/`COMMIT;`, `DROP TRIGGER IF EXISTS` antes de `CREATE TRIGGER`, reuso de `public.handle_updated_at()`, índice `<tabela>_<colunas>_idx`, dinheiro `NUMERIC(18, 4)`, quantidade `NUMERIC(18, 8)`.
- Dados só via hooks TanStack Query em `portfolio/hooks/`, query key `['portfolio','positions',userId]`, `invalidateQueries` após mutation.
- Imports relativos; não existe alias `@/`. `tsc -b` roda `strict` e `noUnusedLocals` — import não usado quebra o build.

**Ask First:**
- Apagar ou reescrever `pnpm-workspace.yaml`: contém `allowBuilds:` em vez de `packages:` e faz todo comando pnpm falhar com `ERROR packages field missing or empty`.
- Alterar migrations `001`–`005`, já aplicadas e registradas.

**Never:**
- Diferido em `deferred-work.md`, não criar aqui: `transactions`, enum `transaction_type`, `recalculate_position()`.
- Fora de escopo: CSV (2.5), cotação/valor de mercado/peso e rastreabilidade (2.3), composição (2.4), alertas (2.6).
- Quantidade zero ou negativa não é permitida.
- Sem biblioteca de toast e sem design system; usar o banner inline do módulo `auth`.

## I/O & Edge-Case Matrix

| Cenário | Input / Estado | Comportamento esperado | Tratamento de erro |
|---|---|---|---|
| Cadastro válido | ticker do catálogo, quantidade > 0, preço ≥ 0, data | Linha em `positions` com `user_id` da sessão; modal fecha; tabela revalida | N/A |
| Ticker fora do catálogo | `PETR99` | "Ativo não encontrado", campo oferece busca | Bloqueia submit; FK nunca violada |
| Posição duplicada | `(user_id, ticker)` já existe | Mensagem clara nomeando o ticker | Captura `23505`, não vaza texto cru |
| Quantidade inválida | `0` ou `-5` | Erro de campo do Zod | Submit bloqueado |
| Decimal pt-BR | `10,50` e `1.500,00` | Normaliza para `10.50` e `1500` — vírgula é o separador decimal, ponto é milhar | Não numérico vira erro de campo |
| Ponto sem vírgula (ambíguo) | `1.500` ou `10.50` | Erro de campo pedindo vírgula para os decimais | Nunca inferir se o ponto é milhar ou decimal: gravar `1.500` como 1,5 é erro de 1000× num valor financeiro |
| Isolamento por usuário | usuário B consulta posições de A | Zero linhas | RLS filtra, sem erro |

</frozen-after-approval>

## Code Map

Banco:
- `supabase/migrations/003_create_assets_price_history.sql` — **estilo a copiar**: `assets` L80–95 (`ticker TEXT PRIMARY KEY`, alvo da FK), FK L118, enable RLS L160, policies L163–166, REVOKE/GRANT L178–185, trigger `updated_at` L107–110.
- `supabase/migrations/001_create_users_table.sql` — L5: `public.users.id` é o UUID de `auth.users` e é o alvo de `positions.user_id`. L37: `public.handle_updated_at()`, reusar. L14–32: policies privadas — não replicar, faltam DELETE e `WITH CHECK`.
- `supabase/migrations/004_harden_default_privileges.sql` — só `TRUNCATE` saiu dos defaults; daí o REVOKE explícito.
- `ARCHITECTURE-SPINE.md` L369–384 — colunas de `positions`; autoridade, exceto o nome do índice.

Frontend:
- `src/routes.tsx:12` — placeholder a substituir; `:38-39` monta `index` + `/carteira`, preservar as duas.
- `src/modules/auth/components/LoginForm.tsx:16-51` — wiring RHF + Zod + `useMutation`; `:63-118` markup; `:31-46` erro → banner.
- `src/modules/auth/components/PasswordRecoveryForm.tsx:21-44,75-83` — banner de sucesso; precedente de fechar no sucesso.
- `src/modules/auth/services/authService.ts:1-4,66-75` — forma do service: objeto literal, `{ data, error }`, `if (error) throw error`.
- `src/modules/auth/hooks/useAuth.ts:4-24` — `useAuth()` dá `user.id`.
- `src/modules/auth/schemas/loginSchema.ts` — layout Zod + `z.infer`.
- `src/shared/services/supabaseClient.ts:10` — `supabase`; de `portfolio/services/` importa `'../../../shared/services/supabaseClient'`.
- `src/shared/components/Layout.tsx:5` — nav já aponta `/carteira`.
- `prototypes/valora_carteira.html:314` — botão primário "+ adicionar posição" acima da tabela.
- `tailwind.config.js` — únicos tokens: `dark-bg`, `dark-surface`, `dark-border`.

Criar do zero: módulo `portfolio`, componente de Modal (não há portal, focus trap nem `role="dialog"` no projeto), primeira query key e primeiro `invalidateQueries` do código, service de leitura de `assets`.

## Tasks & Acceptance

**Execution:**
- [x] `pnpm-workspace.yaml` -- reescrito com `packages: ['.']` (continha `allowBuilds:` e quebrava todo comando pnpm); `eslint.config.js` criado, pois não existia e o ESLint 9 exige flat config, com `supabase/functions` fora do escopo por ser Deno; `SignupForm.tsx:31` alinhado a `(error: Error)`, padrão dos outros três formulários -- `pnpm build` e `pnpm lint` passam
- [x] `supabase/migrations/006_create_positions.sql` -- `positions` com `UNIQUE (user_id, ticker)`, `CHECK (quantity > 0)`, `CHECK (average_price >= 0)`, `acquisition_date DATE NOT NULL`, RLS, quatro policies, REVOKE/GRANT, índice, trigger de `updated_at` -- unicidade e índice são um único objeto (`CREATE UNIQUE INDEX positions_user_id_ticker_idx`), porque uma constraint UNIQUE já cria índice sobre as mesmas colunas e o par seria redundante; FK de `ticker` para `assets` acrescentada à arquitetura, que não tinha nenhuma
- [x] `src/modules/portfolio/types.ts` -- `Position`, `NewPosition`, `Asset`, mais `PositionWithAsset` para o join do catálogo
- [x] `src/modules/portfolio/services/positionService.ts` -- inserir e listar `positions`, buscar `assets` por ticker exato e por ticker/nome; termo de busca sanitizado antes de entrar em `.or(...)`, senão vírgula e parêntese digitados viram sintaxe de filtro do PostgREST
- [x] `src/modules/portfolio/hooks/usePositions.ts` -- `useQuery` com `['portfolio','positions',userId]`, exportando o construtor da key para a mutation não divergir
- [x] `src/modules/portfolio/hooks/useAddPosition.ts` -- `useMutation` + `invalidateQueries` na mesma key
- [x] `src/modules/portfolio/hooks/useAssetSearch.ts` -- não previsto na lista: `AGENTS.md` exige que todo acesso a dados passe por hook TanStack Query, e o autocomplete e a checagem de catálogo do submit são acesso a dados (`useAssetSearch` para sugestões, `useAssetLookup` com `fetchQuery` para o ticker exato)
- [x] `src/modules/portfolio/schemas/positionSchema.ts` -- Zod, mensagens pt-BR, `parseDecimalPtBr` (`10,50`→`10.5`, `1.234,56`→`1234.56`, expoente e lixo → erro de campo) -- 25 asserções verificadas
- [x] `src/shared/components/Modal.tsx` -- portal, `role="dialog"`, `aria-modal`, Escape e overlay fecham, foco inicial e devolução, Tab preso; Escape tratado no container do diálogo (não em `document`) para que o autocomplete possa interceptá-lo e fechar só a lista
- [x] `src/modules/portfolio/components/AddPositionForm.tsx` -- combobox contra o catálogo (setas + `aria-activedescendant`, opções fora da ordem de Tab) e caminho "Ativo não encontrado" com sugestões; erros do Postgres mapeados por SQLSTATE (23505 nomeia o ticker, 23503, 23514, 42501), nunca por texto cru
- [x] `src/modules/portfolio/components/PositionsTable.tsx` -- ticker, nome, quantidade, preço médio, data, e estado vazio; preço formatado na moeda de `assets.currency`, e data fatiada da string ISO em vez de passar por `Date`, que desloca o dia em fuso negativo
- [x] `src/modules/portfolio/components/CarteiraPage.tsx` -- página real com "+ adicionar posição", modal, banner de sucesso e estados de carga e erro
- [x] `src/routes.tsx` -- importa `CarteiraPage`, placeholder removido, rotas `index` e `/carteira` preservadas
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- `2-2` em `in-progress`; `2-8` para `done` (entregue no PR #19). Commits não criados: fora do que foi pedido nesta sessão
- [x] Vitest -- não havia runner de teste algum no repositório, e as asserções da primeira passada eram descartáveis. `vitest@2.1.9`, `jsdom@25.0.1` e Testing Library pinados em versão exata; bloco `test` no `vite.config.ts` com `include` restrito a `src`, o que mantém `supabase/functions` (Deno, imports por URL) fora do runner; `tsconfig.test.json` referenciado pela raiz, para que `tsc -b` verifique os testes sem que eles entrem no projeto do app
- [x] Testes da matriz de I/O -- `src/test/supabaseMock.ts` substitui o client Supabase, e não o `positionService`, de modo que o service real roda e o teste inspeciona o payload que iria ao banco: é o que permite afirmar que o `user_id` vem da sessão
- [x] `supabase/tests/` -- harness de RLS persistido (stub + asserções + runner), antes escrito em `/tmp` e perdido; `supabase/migrations/README.md` atualizado até a `006`, que listava só a `001`

- [x] `src/modules/portfolio/schemas/positionSchema.ts` -- rejeitar ponto sem vírgula com erro de campo, em vez de tratá-lo como decimal -- regra renegociada por Samuel em 2026-09-08; ver Spec Change Log
- [x] Asserções para os guards hoje desprotegidos -- `sanitizeSearchTerm`, `stopPropagation` do Escape no combobox, Escape/overlay/foco/Tab do `Modal`, os quatro ramos de SQLSTATE (23505, 23503, 23514, 42501), o argumento de moeda em `formatMoney` e o `.limit(POSITIONS_LIMIT)` -- mutação provou que remover qualquer um deles deixa a suíte verde

**Acceptance Criteria:**
- Dado um usuário autenticado na Carteira, quando cadastra ticker do catálogo com quantidade > 0, preço ≥ 0 e data, então existe linha em `positions` com o `user_id` da sessão e a tabela reflete a posição sem recarregar a página.
- Dados dois usuários com posições, quando um consulta `positions`, então só as próprias linhas retornam, e `anon` não tem privilégio algum sobre a tabela nova.
- Dada uma posição recém-criada, quando é lida, então vale sem nenhuma transação associada (AD-8).
- Dado `pnpm install` concluído, quando `pnpm build` e `pnpm lint` rodam, então ambos passam sem erro.

## Spec Change Log

- **2026-09-08 — iteração 1.**
  **Achados que dispararam:** (1) `intent_gap` — a matriz especificava só `10,50` → `10.50` e não dizia o que fazer com ponto sem vírgula; verificado que `parseDecimalPtBr('1.500')` devolvia `1.5` e `'12.345'` devolvia `12.345`. (2) `bad_spec` — a seção Verification não exigia asserção para os guards que a implementação criou, e teste por mutação provou que remover `sanitizeSearchTerm`, o `stopPropagation` do Escape, o gerenciamento de foco do `Modal`, a mensagem do 23514, o argumento de moeda ou o `.limit(50)` deixava 39/39 verdes. (3) `bad_spec` — Verification não fixava timezone, então uma regressão de data passaria num runner UTC.
  **O que foi emendado:** a linha da matriz de decimal foi renegociada por Samuel (regra "rejeitar ambíguo") e desdobrada em duas linhas; duas tasks novas foram acrescentadas; Verification passa a fixar TZ.
  **Estado ruim evitado:** gravar valor financeiro 1000× menor em silêncio, e um conjunto de guards sem rede que voltariam a quebrar sem que nenhum teste percebesse.
  **KEEP — deve sobreviver a qualquer re-derivação:** a migration `006` como está (quatro policies por operação com `WITH CHECK` no INSERT e UPDATE, `REVOKE ALL` antes do `GRANT`, FK de ticker com `ON DELETE RESTRICT`, unicidade e índice no mesmo objeto); o harness de RLS que reproduz os DEFAULT PRIVILEGES amplos do Supabase antes de aplicar as migrations, para o REVOKE não passar por vacuidade; `src/test/supabaseMock.ts` substituindo o client e não o service, que é o que permite afirmar que o `user_id` vem da sessão; e a disciplina de provar cada teste por mutação antes de considerá-lo cobertura.

## Verification

**Commands:**
- `pnpm test:run` -- Vitest sobre a matriz de I/O: `positionSchema.test.ts` (decimal pt-BR e ponto ambíguo rejeitado, quantidade inválida), `positionService.test.ts` (`user_id` da sessão, SQLSTATE propagado, `sanitizeSearchTerm`, `.limit`), `AddPositionForm.test.tsx` (os quatro ramos de SQLSTATE, "Ativo não encontrado" bloqueando o submit, insert + invalidação da query key, Escape sobre a lista de sugestões), `CarteiraPage.test.tsx` (modal fecha e tabela revalida), `Modal.test.tsx` (Escape, overlay, Tab e devolução de foco) -- esperado: zero falha
- TZ fixado na configuração do Vitest, não deixado ao ambiente: `formatDate` existe para evitar o deslocamento de dia que `new Date()` causa em fuso negativo, e num runner UTC essa regressão passa verde. Confirmar rodando também com `TZ=America/Sao_Paulo` explícito -- esperado: zero falha nos dois casos
- `pnpm test:rls` -- harness persistido em `supabase/tests/`: sobe `postgres:15-alpine`, aplica `000_stub_supabase.sql` (schema `auth`, `auth.users`, `auth.uid()`, roles, `pgcrypto`/`pg_trgm` e os DEFAULT PRIVILEGES amplos do Supabase, para que o REVOKE da 006 não passe por vacuidade), aplica `001`→`004` e `006` (pula a `005`, que exige `pg_cron`/`pg_net`/`vault`) e roda `010_positions_rls_test.sql` -- esperado: 32 asserções PASS e status 0; status diferente de zero na primeira falha, o que torna o script usável como gate
- `pnpm build` -- esperado: `tsc -b` sem erro (projetos `app`, `node` e `test`) e bundle gerado
- `pnpm lint` -- esperado: zero erro

**Manual checks (if no CLI):**
- Modal só por teclado: Tab circula dentro, Escape fecha, foco volta ao botão que o abriu.
- Contraste de campos e erros no tema dark em WCAG AA.

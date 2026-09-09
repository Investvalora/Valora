<!-- bmad:context -->
<!-- Verified 2026-09-08 against 6ba9670. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## Valora

Plataforma de análise e gestão de investimentos para investidores brasileiros.
Vite + React 18 + TypeScript, Supabase (Postgres 15, Auth, Edge Functions Deno).
Planejamento em `_bmad-output/planning-artifacts/`; arquitetura em
`ARCHITECTURE-SPINE.md`; status do sprint em
`_bmad-output/implementation-artifacts/sprint-status.yaml`. Tickets no Jira,
board KAN (`valorainvest.atlassian.net`).

## Policy

- Nunca faça push direto na `main`; sempre via PR. Branch `feature/VLR-00NN`,
  commits prefixados com a issue do Jira (`KAN-N`).
- Toda tabela do schema `public` tem RLS habilitado, sem exceção (AD-6): os
  default privileges do Supabase concedem escrita a `anon`/`authenticated` em
  toda tabela nova, então sem RLS o grant vira escrita real.
- Nunca versione `.env` (só `.env.example`); segredos de runtime ficam no Vault.

## Where things are

- Módulos de domínio em `src/modules/{dominio}/`; compartilhado em `src/shared/`.
- Migrations em `supabase/migrations/` numeradas; ao aplicar, registrar em
  `supabase_migrations.schema_migrations`, senão repositório e banco divergem.
- Edge Functions em `supabase/functions/` — leia o `README.md` de lá antes de
  criar ou editar uma (armadilhas de deploy documentadas ali).
- Story em andamento: procure um `*-handoff.md` em
  `_bmad-output/implementation-artifacts/`.

## Running and verifying

- `pnpm` 9.x é o gerenciador (README declara; não há `packageManager` no
  `package.json` — instale via corepack se ausente).
- Valide migrations em Postgres efêmero antes do banco hospedado: elas dependem
  de `auth.uid()` e do schema `auth`, que não existem em Postgres puro — crie
  stubs antes de aplicar.

## Conventions that differ from defaults

- Acesso a dados só via hooks TanStack Query; services de módulo encapsulam o
  Supabase client. Query key `['dominio','recurso',...params]`; invalidar cache
  após mutation.
- Estado global via Zustand (`store.ts` no módulo), não Context API.

## Known pitfalls

- Ao pushar trabalho novo numa branch já mergeada, confirme o merge antes:
  commits pós-merge ficam órfãos e criam drift entre `main` e banco
  (ocorrido entre os PRs #18 e #19).
- Preço BR em `price_history` é COTAHIST bruto (`adjusted_close = close`); o
  ajuste real por proventos depende do histórico de dividendos (Épico 3).

<!-- /bmad:context -->

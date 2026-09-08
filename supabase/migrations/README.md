# Supabase Migrations

Este diretório contém as migrations SQL do projeto Valora.

## Como executar as migrations

### Opção 1: Supabase Dashboard (Recomendado para dev)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo de cada migration em ordem
4. Execute cada uma

### Opção 2: Supabase CLI

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref your-project-ref

# Executar migrations
supabase db push
```

> Ao aplicar uma migration à mão, registre-a em
> `supabase_migrations.schema_migrations`. Sem isso o repositório e o banco
> divergem, e a próxima auditoria não distingue o que já rodou.

## Migrations

### 001_create_users_table.sql
- Cria tabela `users` para perfis de usuário
- Configura RLS (Row Level Security)
- Policies: usuário só acessa próprio perfil
- Trigger para updated_at automático (`public.handle_updated_at()`, reusada pelas migrations seguintes)

**Executar após:** Criar projeto Supabase
**Necessário para:** Story 1.2 (Cadastro de Usuário)

### 002_create_user_trigger.sql
- `public.handle_new_user()` + trigger `on_auth_user_created` em `auth.users`
- Cria a linha em `public.users` automaticamente no signup

**Executar após:** 001
**Necessário para:** Story 1.2 (Cadastro de Usuário)

### 003_create_assets_price_history.sql
- Recria `assets` e `price_history` reconciliando o drift auditado em 2026-09-08
- Enums `public.asset_type` e `public.quote_provider`; coluna `assets.currency`
- Índice trigram em `assets.name` (busca por nome); requer `pg_trgm`
- RLS habilitada com SELECT liberado a `authenticated`; `anon` sem grant

**Executar após:** 002
**Necessário para:** Story 2.1 (Catálogo de Ativos e Histórico de Preços)

### 004_harden_default_privileges.sql
- Remove `TRUNCATE` dos DEFAULT PRIVILEGES do schema `public` (RLS não intercepta TRUNCATE)
- Normaliza os grants de `public.users` para a intenção da 001

**Executar após:** 003
**Necessário para:** toda tabela criada depois (AD-6)

### 005_schedule_b3_price_sync.sql
- Agenda o sync diário de preços da B3 via `pg_cron` + `pg_net`, com segredo no `vault`
- **Só roda em Supabase hospedado:** depende de `pg_cron`, `pg_net` e `vault`, ausentes no Postgres oficial

**Executar após:** 004
**Necessário para:** Story 2.8 (Sincronização de Preços B3)

### 006_create_positions.sql
- Cria `public.positions` (posições do usuário), FK de `ticker` para `assets`
- `CHECK (quantity > 0)`, `CHECK (average_price >= 0)`, `CREATE UNIQUE INDEX positions_user_id_ticker_idx`
- RLS habilitada com quatro policies por operação em `auth.uid() = user_id`, `WITH CHECK` no INSERT e no UPDATE
- `REVOKE ALL ... FROM anon, authenticated` antes de `GRANT ... TO authenticated`; `anon` sem grant algum

**Executar após:** 005 (ou 004, se 005 não se aplicar ao ambiente)
**Necessário para:** Story 2.2 (Adicionar Posição Manual)

## Testar RLS localmente

`supabase/tests/` traz um harness que sobe um Postgres efêmero, aplica as
migrations e verifica o isolamento por usuário de `public.positions` — a linha
"Isolamento por usuário" da matriz da Story 2.2, que não é testável em unidade
porque o comportamento é do banco.

```bash
pnpm test:rls                    # exige docker no PATH
KEEP_CONTAINER=1 pnpm test:rls   # mantém o container para inspeção manual
```

Sai com status 0 quando toda asserção passa e diferente de zero na primeira
falha, então serve como gate de CI.

Arquivos:

| Arquivo | Papel |
|---|---|
| `tests/000_stub_supabase.sql` | Schema `auth`, `auth.users`, `auth.uid()`, roles `anon`/`authenticated`/`service_role`, extensões `pgcrypto` e `pg_trgm`, e os DEFAULT PRIVILEGES amplos do Supabase — aplicados **antes** das migrations, para que o `REVOKE` da 006 seja exercitado de verdade |
| `tests/010_positions_rls_test.sql` | Asserções: B lê zero linhas de A, UPDATE/DELETE de B não alcançam A, A não insere posição de B (42501), `anon` sem privilégio algum, `authenticated` sem TRUNCATE, e os SQLSTATE 23505/23514/23503 das constraints |
| `tests/run-rls-tests.mjs` | Runner: container, ordem de aplicação e teardown |

O harness aplica `001`→`004` e `006`. A **`005` é pulada**: depende de
`pg_cron`, `pg_net` e `vault`, que não existem em `postgres:15-alpine`, e não
toca `positions`.

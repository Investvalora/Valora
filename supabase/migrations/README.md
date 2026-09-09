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

### 007_create_transactions.sql
- Cria o enum `public.transaction_type` (`buy|sell|dividend|jcp|bonus`) e a tabela `public.transactions`, FK de `ticker` para `assets` e de `user_id` para `users`
- `CHECK (quantity > 0)`, `CHECK (price >= 0)`, `brokerage_fee`/`tax` `NOT NULL DEFAULT 0`
- Coluna `seq BIGINT GENERATED ALWAYS AS IDENTITY`: ordem de chegada imutável, usada como desempate do recálculo. **Não trocar por `created_at`/`id`** — num INSERT em lote (importação CSV) todas as linhas compartilham `created_at` e o `id` é UUID aleatório, o que torna o preço médio não-determinístico
- Índices `transactions_user_id_ticker_idx`, `transactions_user_id_ticker_seq_idx`, `transactions_transaction_date_idx`
- `public.recalculate_position(user_id, ticker)` (plpgsql, **sem `SECURITY DEFINER`**) + trigger `recalculate_position_on_transaction` `AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW`: reconstrói `positions` por média móvel ponderada com baixa a custo médio, ordenando por `(transaction_date, seq)`; quantidade líquida ≤ 0 **apaga** a posição; `acquisition_date` vem de `MIN(transaction_date)` das compras
- RLS habilitada com quatro policies por operação em `auth.uid() = user_id`, `WITH CHECK` no INSERT e no UPDATE
- `REVOKE ALL ... FROM anon, authenticated` antes de `GRANT ... TO authenticated`; `anon` sem grant algum
- `dividend`/`jcp`/`bonus` são gravados mas não movem quantidade nem custo (proventos são do Épico 3)

**Executar após:** 006
**Necessário para:** Story 2.5 (Importar Transações via CSV)

## Testar RLS localmente

`supabase/tests/` traz um harness que sobe um Postgres efêmero, aplica as
migrations e verifica o que é comportamento de BANCO e não é testável em
unidade: o isolamento por usuário de `public.positions` e de
`public.transactions` (a linha "Isolamento por usuário" das matrizes das
Stories 2.2 e 2.5) e a aritmética do recálculo de preço médio.

```bash
pnpm test:rls                    # exige docker no PATH
KEEP_CONTAINER=1 pnpm test:rls   # mantém o container para inspeção manual
```

Sai com status 0 quando toda asserção passa e diferente de zero na primeira
falha, então serve como gate de CI.

Arquivos:

| Arquivo | Papel |
|---|---|
| `tests/000_stub_supabase.sql` | Schema `auth`, `auth.users`, `auth.uid()`, roles `anon`/`authenticated`/`service_role`, extensões `pgcrypto` e `pg_trgm`, e os DEFAULT PRIVILEGES amplos do Supabase — aplicados **antes** das migrations, para que o `REVOKE` da 006 e da 007 seja exercitado de verdade |
| `tests/010_positions_rls_test.sql` | Asserções: B lê zero linhas de A, UPDATE/DELETE de B não alcançam A, A não insere posição de B (42501), `anon` sem privilégio algum, `authenticated` sem TRUNCATE, e os SQLSTATE 23505/23514/23503 das constraints |
| `tests/020_transactions_rls_test.sql` | Asserções da 007: isolamento A/B em `transactions`, 42501, `anon` sem grant, 23503/23514, `seq` imutável (428C9), função sem `SECURITY DEFINER`, trigger em I/U/D (`tgtype` 29) — e a matriz do recálculo: média móvel (10,00 → 15,00 → 15,00), lote de mesma data em ordem-sensível dando **20,00**, venda que zera **apagando a linha**, venda maior que a posição (por último e antes das compras), DELETE recalculando, dividendo sem compra não materializando posição, UPDATE de ticker recalculando os dois pares, e chamada com `user_id` alheio inerte |
| `tests/run-rls-tests.mjs` | Runner: container, ordem de aplicação e teardown |

O harness aplica `001`→`004`, `006` e `007`, e depois os dois arquivos de
asserção no mesmo banco (a `020` usa identidades e fixtures próprias para não
depender do estado da `010`). A **`005` é pulada**: depende de `pg_cron`,
`pg_net` e `vault`, que não existem em `postgres:15-alpine`, e não toca
`positions` nem `transactions`.

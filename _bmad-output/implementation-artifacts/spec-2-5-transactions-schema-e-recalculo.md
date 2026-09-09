---
title: 'Story 2.5 (backend) — Schema de Transações e Recálculo de Posição'
type: 'feature'
created: '2026-09-09'
status: 'done'
baseline_commit: '168d3e41356749708b1436705d8fcbf5db548f24'
review_loop_iteration: 1
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A 2.2 entregou posições independentes de transações, e a `transactions` + o recálculo server-side de preço médio foram deliberadamente diferidos até existir uma fonte de transações. A importação CSV (2.5) é essa fonte, mas o AC exige que "para cada ticker importado, preço médio ponderado e quantidade líquida sejam recalculados no servidor" (AR-6/AR-8) — sem a tabela e o gatilho, não há onde a importação gravar nem o que recalcular. Esta fatia (dividida da 2.5 por decisão de escopo) entrega só a fundação de banco, testável isoladamente antes de a UI de CSV depender dela.

**Approach:** Uma migration nova cria o enum `transaction_type` (`buy|sell|dividend|jcp|bonus`), a tabela `transactions` (com RLS por `user_id = auth.uid()`), e a função `recalculate_position(user_id, ticker)` disparada por trigger em INSERT/UPDATE/DELETE de `transactions`. O recálculo percorre as transações do par `(user_id, ticker)` por `transaction_date` e reconstrói `positions`: quantidade líquida e preço médio por **média móvel ponderada com baixa a custo médio** (não a fórmula agregada insensível à ordem). Venda que zera a posição a apaga; posição recriada por compra deriva `acquisition_date` de `MIN(transaction_date)` das compras. Testes RLS/SQL provam isolamento, constraints e a aritmética do recálculo.

## Boundaries & Constraints

**Always:**
- Preço médio é **média móvel ponderada com baixa a custo médio**, calculada percorrendo as transações por `transaction_date` (decisão preservada da 2.2): na sequência compra 100@10 → venda 50@20 → compra 50@30 o preço médio final é 20,00, não os 16,67 da fórmula agregada insensível à ordem de `stories-detailed-DEPRECATED.md`.
- O trigger dispara em INSERT, UPDATE **e** DELETE, retorna `COALESCE(NEW, OLD)` e **não** usa `SECURITY DEFINER` (roda como o usuário; RLS de `positions`/`transactions` já ampara). Remoção de transação recalcula — a posição pode voltar a não ter nenhuma transação, ou a zerar.
- Venda que leva a quantidade líquida a zero (ou a ≤ 0) **apaga** a posição em vez de gravar quantidade zero — mantém o `CHECK (quantity > 0)` da 006 coerente. Quantidade líquida negativa (mais venda que compra) é tratada explicitamente: a posição é apagada e o recálculo não estoura.
- `positions.acquisition_date` é `NOT NULL`: no caminho do trigger, ao recriar/atualizar a posição, deriva-se de `MIN(transaction_date)` das **compras** do ticker; sem compras (só dividendo/JCP) não há posição a materializar por preço.
- RLS universal (AD-6): `transactions` com `ENABLE ROW LEVEL SECURITY` e policies `auth.uid() = user_id` (SELECT/INSERT/UPDATE/DELETE, `WITH CHECK` no INSERT e UPDATE); `REVOKE ALL FROM anon, authenticated` antes de `GRANT` só a `authenticated`; `anon` sem grant algum. Os default privileges amplos do Supabase concedem escrita a `anon`/`authenticated` em toda tabela nova.
- Migration numerada `007_`, no padrão das anteriores: nomes de índice `<tabela>_<colunas>_idx` (não `idx_*`), `BEGIN/COMMIT`, comentários explicando divergências da arquitetura. Registrar em `supabase_migrations.schema_migrations` ao aplicar.
- Dinheiro em `NUMERIC(18,4)`, quantidade em `NUMERIC(18,8)` (cripto fracionária), como em `positions`/`price_history`. Preço na moeda de cotação do ativo, não em BRL.

**Ask First:**
- Divergir do schema da arquitetura (`ARCHITECTURE-SPINE.md` L392–413) além dos desvios já justificados (padrão de índice, policies por operação, FK de `ticker`). A arquitetura é a autoridade das colunas.
- Recalcular preço médio de forma que dependa da moeda (converter USD): **não** fazer aqui — preço médio e quantidade são na moeda do ativo; conversão é da camada de exibição (2.3/2.4).

**Never:**
- Fora de escopo (diferido para a próxima story): parser CSV, validação de arquivo, fluxo de UI de upload/preview/correção, qualquer componente React. Esta fatia não tem superfície de UI.
- Não usar `SECURITY DEFINER` no trigger; não usar a fórmula agregada insensível à ordem para preço médio; não gravar posição com `quantity <= 0`.
- Não tocar a migration 006 nem redefinir `positions`. `transactions` referencia `assets(ticker)` por FK como a 006 fez (ticker fora do catálogo não vira transação).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Primeira compra | `buy` 100 PETR4 @ 10 | `positions` recriada: qty 100, preço médio 10,00, `acquisition_date` = data da compra | N/A |
| Compras somam preço médio | `buy` 100@10 depois `buy` 100@20 | qty 200, preço médio 15,00 | N/A |
| Venda parcial a custo médio | após 200@15, `sell` 50@30 | qty 150, preço médio **15,00** (baixa a custo médio não muda o médio) | N/A |
| Sequência sensível à ordem | `buy` 100@10 → `sell` 50@20 → `buy` 50@30 | preço médio 20,00 (não 16,67) | N/A |
| Venda que zera | após 100@10, `sell` 100@10 | posição de PETR4 é **apagada** de `positions` | N/A |
| Venda maior que a posição | após 100@10, `sell` 150 | posição apagada; recálculo não estoura nem grava qty negativa | Tratado |
| Remoção de transação | apaga a última `buy` de um ticker com 1 compra | posição volta a não existir (recalculada a partir do que sobrou) | N/A |
| Só provento, sem compra | `dividend` PETR4 sem nenhuma `buy` | nenhuma posição materializada por preço; recálculo não cria linha inválida | Tratado |
| Ticker fora do catálogo | `insert transactions` com ticker inexistente | rejeitado pela FK (SQLSTATE 23503) | Erro de constraint |
| Isolamento por usuário | B tenta ler/alterar `transactions` de A | zero linhas no SELECT; INSERT em nome de A barrado (42501) | RLS |
| anon | role `anon` tenta qualquer operação | sem privilégio algum | REVOKE/RLS |

</frozen-after-approval>

## Code Map

Autoridade e decisões preservadas (ler antes de escrever):
- `_bmad-output/planning-artifacts/architecture/architecture-Valora-2026-08-15/ARCHITECTURE-SPINE.md` L392–413 -- schema autoritativo de `transactions` e do enum `transaction_type`. Colunas: `id, user_id, ticker, type, quantity, price, brokerage_fee, tax, transaction_date, created_at`.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- bloco da 2.2: fórmula de média móvel ponderada (16,67 vs 20,00), venda-que-zera apaga, trigger em I/U/D com `COALESCE(NEW,OLD)` sem `SECURITY DEFINER`, `acquisition_date` de `MIN(transaction_date)`.

Criar:
- `supabase/migrations/007_create_transactions.sql` -- enum `transaction_type`; tabela `transactions` (FK `ticker`→`assets(ticker)` ON DELETE RESTRICT, FK `user_id`→`users(id)` ON DELETE CASCADE, `CHECK (quantity > 0)`, `CHECK (price >= 0)`, `brokerage_fee`/`tax` default 0, **coluna `seq BIGINT GENERATED ALWAYS AS IDENTITY` para ordem determinística**); índices `transactions_user_id_ticker_idx`, `transactions_transaction_date_idx`, `transactions_user_id_ticker_seq_idx`; `recalculate_position(p_user_id UUID, p_ticker TEXT)` (LANGUAGE plpgsql, sem `SECURITY DEFINER`) ordenando por `(transaction_date, seq)` + trigger `AFTER INSERT OR UPDATE OR DELETE ... FOR EACH ROW`; RLS 4 policies; `REVOKE`/`GRANT`. Modelo direto: `006_create_positions.sql`.
- `supabase/tests/020_transactions_rls_test.sql` -- espelha `010_positions_rls_test.sql`: B não lê/edita transações de A, INSERT em nome de A → 42501, `anon` sem privilégio, SQLSTATE 23503 (FK ticker) e 23514 (quantity/price). Novas asserções do recálculo: as linhas da matriz (média móvel, venda-que-zera apaga, ordem-sensível 20,00, remoção recalcula, só-dividendo não materializa).
- `supabase/tests/run-rls-tests.mjs` -- **alterar** para aplicar também a `007` e o novo arquivo `020_*` na ordem (hoje aplica 001→004 e 006; ver README).

Banco existente a respeitar:
- `supabase/migrations/006_create_positions.sql` -- `positions(user_id, ticker)` único, `CHECK (quantity > 0)`, `acquisition_date NOT NULL`, `public.handle_updated_at()` reusável. O recálculo faz UPSERT/DELETE em `positions` por `(user_id, ticker)`.
- `supabase/tests/000_stub_supabase.sql` -- schema `auth`, `auth.uid()`, roles, default privileges amplos aplicados ANTES das migrations (para o REVOKE da 007 ser exercitado). Reusar como está.
- `supabase/migrations/README.md` -- **alterar**: acrescentar a seção da 007 e atualizar a tabela de testes RLS.

Frontend/serviço: nenhuma mudança nesta fatia (a gravação em `transactions` vem com o CSV, na próxima story).

## Tasks & Acceptance

**Execution:**
- [ ] `supabase/migrations/007_create_transactions.sql` -- enum `transaction_type`, tabela `transactions` com FKs/CHECKs/índices no padrão do repo, RLS (4 policies `auth.uid()=user_id`, `WITH CHECK` em INSERT/UPDATE), `REVOKE ALL FROM anon, authenticated` + `GRANT` só a `authenticated` -- fundação de dados; espelha a 006
- [ ] `supabase/migrations/007_create_transactions.sql` -- `recalculate_position(p_user_id, p_ticker)` (plpgsql, sem `SECURITY DEFINER`) percorrendo transações por `transaction_date` **e por uma coluna sequencial monotônica** (ver abaixo): média móvel ponderada com baixa a custo médio; qty líquida ≤ 0 → DELETE da posição; qty > 0 → UPSERT com `acquisition_date = MIN(transaction_date)` das compras; trigger `AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW` retornando `COALESCE(NEW, OLD)` -- recálculo server-side idempotente e sensível à ordem
- [ ] `supabase/migrations/007_create_transactions.sql` -- **ordenação determinística (achado da iteração 1):** adicionar coluna `seq BIGINT GENERATED ALWAYS AS IDENTITY` (ou `BIGSERIAL`) a `transactions`; o `ORDER BY` do recálculo é `transaction_date, seq` — nunca `created_at`/`id`, que empatam num INSERT em lote (a importação CSV grava N linhas no mesmo statement com o mesmo `NOW()`, e o `id` UUID é aleatório). Sem isso a média móvel vira não-determinística no exato caminho de consumo (CSV): a sequência golden produz 20,00 só às vezes. Índice `transactions_user_id_ticker_seq_idx (user_id, ticker, seq)` para servir o loop -- ordem estável e reproduzível
- [ ] `supabase/tests/020_transactions_rls_test.sql` -- asserções de RLS/constraints (isolamento A/B, 42501, anon sem grant, 23503, 23514) e da matriz de recálculo (média móvel, ordem-sensível 20,00, venda-que-zera apaga, venda-maior-que-posição, remoção recalcula, só-dividendo não materializa) -- comportamento de banco não testável em unidade. **Achado da iteração 1:** (a) a sequência ordem-sensível deve ser inserida **num único INSERT em lote, todas na mesma `transaction_date`**, e ainda assim resultar em 20,00 — é o caso que a coluna `seq` conserta e que o teste anterior não exercia (usava datas distintas); (b) a asserção de venda-que-zera não pode se apoiar em `NOT EXISTS (quantity <= 0)` (vacuamente verdadeira pelo `CHECK` da 006) — asserta a **ausência da linha** e/ou a quantidade líquida esperada; (c) venda-maior-que-posição provada também na ordem em que a venda precede compras (reordenação), não só venda-por-último
- [ ] `supabase/tests/run-rls-tests.mjs` -- aplicar `007` e `020_*` na ordem, após 006 -- o gate de CI passa a cobrir transações e recálculo
- [ ] `supabase/migrations/README.md` -- seção da 007 e atualização da tabela de testes RLS -- repositório e banco não divergem

**Acceptance Criteria:**
- Dada uma sequência de compras e vendas de um ticker inserida em `transactions`, quando o trigger recalcula, então `positions` reflete a quantidade líquida e o preço médio por média móvel ponderada com baixa a custo médio (compra 100@10 → venda 50@20 → compra 50@30 resulta em preço médio 20,00).
- Dada uma venda que leva a quantidade líquida a zero ou menos, quando o recálculo roda, então a linha correspondente em `positions` é apagada, nunca gravada com `quantity <= 0`.
- Dada a remoção de uma transação, quando o trigger de DELETE roda, então a posição é recalculada a partir das transações restantes (podendo deixar de existir).
- Dado um usuário B, quando tenta ler ou alterar transações do usuário A, então o SELECT retorna zero linhas e a escrita é barrada por RLS (42501); `anon` não tem privilégio algum.
- Dada uma transação com ticker fora do catálogo, quando o INSERT roda, então é rejeitada pela FK (SQLSTATE 23503).
- Dado `pnpm test:rls`, quando roda, então sobe o Postgres efêmero, aplica 001→004, 006, 007 e verifica todas as asserções acima com status de saída 0.

## Spec Change Log

- **2026-09-09 — iteração 1.**
  **Achado que disparou:** `bad_spec` (severidade alta), convergente nas três camadas de review e **demonstrado por execução**: o recálculo ordenava por `transaction_date, created_at, id`, mas numa importação CSV (o caminho de consumo desta fatia) todas as linhas do lote compartilham `created_at = NOW()` do statement, e o desempate caía no `id` UUID **aleatório**. A própria sequência golden (100@10 → 50@20 → 50@30) inserida em lote, mesma data, produziu 20,00 apenas 1 vez em 10 — quebrando a AC congelada de "média móvel 20,00, sensível à ordem". Os testes da 1ª derivação usaram datas distintas por par, então passavam sem exercer o caso real. Acoplado: com a venda reordenada antes das compras, o clamp `v_quantity <= 0 → 0` mascarava e a posição ficava **superestimada** (qty 150 vs. líquido 100).
  **O que foi emendado (fora do bloco congelado):** task da migration exige coluna `seq BIGINT GENERATED ALWAYS AS IDENTITY` + índice `(user_id, ticker, seq)`, e o loop ordena por `(transaction_date, seq)`; nova Design Note "Ordem determinística por `seq`"; task de teste passa a exigir a sequência golden **num único INSERT em lote, mesma data**, a asserção de venda-que-zera deixa de ser `NOT EXISTS (quantity <= 0)` (vácua pelo CHECK da 006) e passa a verificar ausência da linha / quantidade líquida, e a venda-maior-que-posição é provada também com a venda precedendo as compras.
  **Estado ruim evitado:** preço médio não-determinístico — reimportar o mesmo CSV daria um número diferente; quantidade superestimada por reordenação silenciosa; suíte verde que não exercia o único caminho que produz o bug (bulk same-date).
  **Achados classificados como não-problema desta story:** concorrência multi-escritor no mesmo par (advisory lock) e tipos societários ausentes (split/amortização) e colisão posição-manual-vs-importada — **deferidos**; underflow/overflow de NUMERIC, `SET search_path`, trigger de TRUNCATE, migration re-runnable/down-script — **rejeitados** (fora do range do MVP, contrariam o house-style das migrations existentes, ou já cobertos por qualificação de schema); "invoker exige grant em positions / quebra o invariante derivado" — **rejeitado**, contrariado por teste que passa (a 006 concede CRUD a `authenticated` e a inserção da 2.2 já dependia disso).
  **KEEP — deve sobreviver à re-derivação:** média móvel ponderada com baixa a custo médio (20,00, não 16,67) com a venda preservando o preço médio; trigger sem `SECURITY DEFINER` retornando `COALESCE(NEW, OLD)`, com o teste que prova a chamada de `user_id` alheio inerte; venda-que-zera **apaga** a posição (mantém `CHECK quantity > 0` da 006); `acquisition_date = MIN(transaction_date)` das compras, não reiniciada em recompra; RLS 4 policies + `REVOKE`/`GRANT` + `anon` sem nada; FK de `ticker`→`assets` (23503); recálculo em I/U/D com recálculo dos dois pares quando o UPDATE troca `(user_id, ticker)`.

## Design Notes

- **Por que média móvel ponderada e não a fórmula agregada.** A fórmula agregada de `stories-detailed-DEPRECATED.md` (soma de custos / soma de quantidades sobre todas as linhas) é insensível à ordem e devolve 16,67 na sequência compra 100@10 → venda 50@20 → compra 50@30. A média móvel percorre por data: a venda a custo médio não altera o preço médio (baixa 50 @ 10, resta 50 @ 10), e a compra seguinte de 50@30 leva a (50×10 + 50×30)/100 = 20,00. É o número que o investidor espera e o que a arquitetura (AR-6) especifica.
- **Ordem determinística por `seq`, não por `created_at`/`id` (achado da iteração 1).** A média móvel é sensível à ordem, então a ordem precisa ser estável e reproduzível. `created_at DEFAULT NOW()` é o timestamp do **statement**: numa importação CSV, N linhas gravadas no mesmo INSERT compartilham `created_at`, e o desempate cairia no `id` UUID aleatório — a própria sequência golden (100@10 → 50@20 → 50@30, mesma data) então produz 20,00 só às vezes. Uma coluna `seq` monotônica (`GENERATED ALWAYS AS IDENTITY`) dá a ordem de chegada real; o loop ordena por `(transaction_date, seq)`. Sem datas distintas para salvar, é o `seq` que garante o resultado.
- **Trigger sem `SECURITY DEFINER`.** O recálculo escreve em `positions` do mesmo `user_id` das transações; as policies de `positions` (006) já permitem ao dono — a inserção da 2.2 já provou isso. `SECURITY DEFINER` só furaria RLS: como a função é chamável, sob DEFINER um usuário passaria o `user_id` de outro e apagaria a posição da vítima. O teste RLS prova que a chamada com `user_id` alheio é inerte.
- **`acquisition_date` no caminho do trigger.** `positions.acquisition_date` é `NOT NULL` e não tem default no upsert do recálculo; derivá-la de `MIN(transaction_date)` das compras é o que evita violar a constraint quando a posição é (re)materializada. Só-dividendo/JCP sem nenhuma compra não materializa posição por preço.
- **Golden do recálculo (para o teste SQL):**
  ```
  buy 100 @ 10  -> qty 100, avg 10.00
  buy 100 @ 20  -> qty 200, avg 15.00
  sell 50 @ 30  -> qty 150, avg 15.00   (baixa a custo médio)
  sell 150 @ 5  -> posição apagada (qty líquida 0)
  ```

## Verification

**Commands:**
- `pnpm test:rls` -- expected: container sobe, migrations 001→004+006+007 aplicam, todas as asserções de RLS/constraints/recálculo passam, status 0
- `pnpm lint` -- expected: sem erros novos (só muda `.mjs`/`.sql`/`.md`, mas roda o gate)
- `pnpm build` -- expected: `tsc -b` + Vite sem erro (nenhuma mudança de TS nesta fatia, confirma que nada quebrou)

**Manual checks:**
- Aplicar `007` num Postgres efêmero e conferir que remover uma transação recalcula a posição (a matriz cobre, mas vale um olhar no plano do trigger de DELETE).

## Suggested Review Order

**Recálculo (o coração da story)**

- Ponto de entrada: a função que reconstrói `positions` a partir do histórico, evento a evento.
  [`007_create_transactions.sql:218`](../../supabase/migrations/007_create_transactions.sql#L218)

- Ordem determinística por `(transaction_date, seq)` — o achado da iteração 1; nunca `created_at`/`id`.
  [`007_create_transactions.sql:244`](../../supabase/migrations/007_create_transactions.sql#L244)

- Guarda final: quantidade líquida ≤ 0 apaga a posição, nunca grava qty ≤ 0.
  [`007_create_transactions.sql:284`](../../supabase/migrations/007_create_transactions.sql#L284)

- Trigger em I/U/D sem `SECURITY DEFINER`, recalcula os dois pares quando o UPDATE troca `(user_id,ticker)`.
  [`007_create_transactions.sql:45`](../../supabase/migrations/007_create_transactions.sql#L45)

**Schema e segurança**

- Coluna `seq GENERATED ALWAYS AS IDENTITY` que sustenta a ordem determinística.
  [`007_create_transactions.sql:126`](../../supabase/migrations/007_create_transactions.sql#L126)

- RLS: 4 policies `auth.uid()=user_id` + `REVOKE`/`GRANT`, `anon` sem nada.
  [`007_create_transactions.sql:175`](../../supabase/migrations/007_create_transactions.sql#L175)

**Provas de banco (não testáveis em unidade)**

- Ordem causal: heap divergindo de `seq`, avg 20,00 só sai ordenando por `seq` (quebra se `seq` sumir do loop).
  [`020_transactions_rls_test.sql:588`](../../supabase/tests/020_transactions_rls_test.sql#L588)

- Golden em INSERT em lote, mesma data — o caminho de consumo real (CSV).
  [`020_transactions_rls_test.sql:506`](../../supabase/tests/020_transactions_rls_test.sql#L506)

- `bonus`/`jcp`/`dividend` inertes; `recalculate_position` com `user_id` alheio é inerte (prova o não-DEFINER).
  [`020_transactions_rls_test.sql:766`](../../supabase/tests/020_transactions_rls_test.sql#L766)

- Runner aplica `007` e `020` na ordem, no mesmo banco efêmero.
  [`run-rls-tests.mjs:61`](../../supabase/tests/run-rls-tests.mjs#L61)

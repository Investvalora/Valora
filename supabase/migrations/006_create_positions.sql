-- Story 2.2: Adicionar Posição Manual — tabela `positions`
--
-- ─── O QUE ESTA MIGRATION ENTREGA ──────────────────────────────────────
--
-- A tabela de posições detidas pelo usuário: o primeiro dado de entrada do
-- Épico 2. Até aqui o banco só tinha contas (001/002) e dado de mercado
-- (003), então não havia como registrar o que o usuário possui.
--
-- ─── POSIÇÃO É INDEPENDENTE DE TRANSAÇÃO (AD-8) ────────────────────────
--
-- Uma posição vale sozinha, sem nenhuma transação associada — é exatamente o
-- caso do cadastro manual desta story. A tabela `transactions`, o enum
-- `transaction_type` e o recálculo server-side de preço médio
-- (`recalculate_position()`) ficam DIFERIDOS: a primeira fonte de transações
-- é a importação CSV da Story 2.5. Ver
-- `_bmad-output/implementation-artifacts/deferred-work.md`.
--
-- Consequência a preservar quando o recálculo existir: `acquisition_date` é
-- NOT NULL, então o caminho do trigger precisará derivá-la de
-- `MIN(transaction_date)` das compras, senão o upsert viola a constraint.
--
-- ─── DIVERGÊNCIAS DELIBERADAS COM A ARQUITETURA ────────────────────────
--
-- ARCHITECTURE-SPINE.md (L369–384) é a autoridade das colunas, com três
-- desvios conscientes:
--
--   1. `CHECK (quantity > 0)` em vez de `>= 0`. Quantidade zero não é
--      posição — o AC da story proíbe zero e negativo. Quando a Story 2.5
--      trouxer vendas, a venda que zera a posição a APAGA, em vez de
--      gravar quantidade zero, o que mantém esta constraint coerente.
--   2. FK de `ticker` para `public.assets(ticker)`, ausente na arquitetura.
--      O AC exige que ticker fora do catálogo não vire posição; a validação
--      no cliente é a mensagem "Ativo não encontrado", e a FK é a garantia
--      real. ON DELETE RESTRICT: ativo delistado não apaga silenciosamente a
--      posição do usuário — a limpeza precisa ser uma decisão explícita.
--   3. Quatro policies por operação em vez de uma `FOR ALL`, e nome de
--      índice no padrão do repositório (`<tabela>_<colunas>_idx`), não
--      `idx_*`. `FOR ALL` sem `WITH CHECK` explícito é fácil de ler errado;
--      separar deixa auditável que INSERT e UPDATE também são amarrados a
--      `auth.uid()`.

BEGIN;

-- ─────────────────────────────────────────────────────────────────
-- positions — o que o usuário possui
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Alvo é `public.users(id)`, que por sua vez referencia `auth.users(id)`
  -- (migration 001, L5). É esse UUID que `auth.uid()` devolve.
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL REFERENCES public.assets(ticker) ON DELETE RESTRICT,
  -- Quantidade em NUMERIC(18, 8): cripto é fracionária.
  quantity NUMERIC(18, 8) NOT NULL,
  -- Dinheiro em NUMERIC(18, 4), como `price_history` (003). O preço está na
  -- moeda de cotação do ativo (`assets.currency`), não necessariamente BRL.
  average_price NUMERIC(18, 4) NOT NULL,
  acquisition_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT positions_quantity_positiva      CHECK (quantity > 0),
  CONSTRAINT positions_average_price_nao_negativo CHECK (average_price >= 0)
  -- Falta aqui, deliberadamente, um `CHECK (acquisition_date <= CURRENT_DATE)`:
  -- `CURRENT_DATE` é STABLE, não IMMUTABLE, e o Postgres recusa a criação da
  -- constraint. Um CHECK só é reavaliado na escrita, então uma expressão que
  -- muda com o tempo tornaria linhas já gravadas retroativamente inválidas —
  -- o que romperia dump/restore e VALIDATE CONSTRAINT. "Data no futuro" é
  -- recusada no cliente, em `positionSchema.acquisitionDate`.
);

-- Unicidade de `(user_id, ticker)` — o AC pede erro claro na duplicata, que
-- chega ao cliente como SQLSTATE 23505.
--
-- É um índice UNIQUE, não um índice comum ao lado de uma constraint UNIQUE:
-- a constraint já cria seu próprio índice sobre as mesmas colunas, então o
-- par seria um índice redundante — custo de escrita e de espaço sem ganho de
-- leitura. Este objeto serve aos dois papéis, e `(user_id, ...)` como prefixo
-- atende a consulta dominante da story, "as posições deste usuário".
CREATE UNIQUE INDEX positions_user_id_ticker_idx ON public.positions(user_id, ticker);

DROP TRIGGER IF EXISTS set_positions_updated_at ON public.positions;
CREATE TRIGGER set_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- RLS: cada usuário só alcança as próprias linhas
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posicoes legiveis pelo proprio usuario"
  ON public.positions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- WITH CHECK barra gravar posição no nome de outro usuário — a migration 001
-- esqueceu isso no UPDATE de `users`, e é o furo que este bloco não repete.
CREATE POLICY "Posicoes inseriveis pelo proprio usuario"
  ON public.positions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Posicoes editaveis pelo proprio usuario"
  ON public.positions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Posicoes removiveis pelo proprio usuario"
  ON public.positions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────
-- Permissões
-- ─────────────────────────────────────────────────────────────────

-- Os default privileges do schema public concedem escrita a `anon` e
-- `authenticated` em toda tabela nova (migration 004 só retirou TRUNCATE dos
-- defaults). RLS filtra INSERT/UPDATE/DELETE, mas o grant não deve existir
-- para quem não tem uso legítimo: `anon` não recebe nada, porque toda rota do
-- app é protegida (Story 1.4) e não há leitura de posição pré-login.
REVOKE ALL ON public.positions FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.positions TO authenticated;

COMMIT;

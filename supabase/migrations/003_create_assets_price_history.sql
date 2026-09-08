-- Story 2.1: Catálogo de Ativos e Histórico de Preços (reconciliação)
--
-- ─── POR QUE ESTA MIGRATION RECRIA EM VEZ DE ALTERAR ───────────────────
--
-- Em 2026-09-08 o banco hospedado foi auditado e apresentava drift em
-- relação ao repositório e à arquitetura:
--
--   * `supabase_migrations.schema_migrations` não existia — nenhuma das
--     migrations deste diretório havia sido aplicada via CLI. O schema foi
--     construído por outra via, então o repositório não era fonte de verdade.
--   * `assets` não tinha a coluna `currency`, exigida pela arquitetura e
--     necessária para exposição internacional (Story 2.4) e conversão USD
--     (Story 2.3).
--   * `price_history` usava `numeric` sem precisão, em vez de NUMERIC(18,4).
--   * O enum `quote_provider` continha o valor `ibovfinancials`, e 27 dos 52
--     ativos (todo o lado brasileiro: stock_br + fii + bdr) apontavam para ele.
--     Esse provedor é um espelho não-oficial do site do Alpha Vantage, servido
--     sob outro domínio, e não respondia a requisições. Nenhum desses 27 ativos
--     possuía histórico de preços.
--   * `anon` e `authenticated` tinham DELETE, INSERT, UPDATE e TRUNCATE nas
--     duas tabelas. RLS barra os três primeiros, mas NÃO barra TRUNCATE.
--
-- Os dados descartados eram 52 ativos e 32 linhas de preço — dado de mercado
-- reproduzível, e majoritariamente proveniente do provedor inválido. Backup
-- integral em .backup-supabase-20260908-144055/ antes da execução.
--
-- Contas de usuário (auth.users, public.users) NÃO são tocadas por esta migration.
--
-- ─── DIVERGÊNCIA DELIBERADA COM A ARQUITETURA ──────────────────────────
--
-- A ARCHITECTURE-SPINE.md (AR-7) especifica tabelas públicas SEM RLS, com
-- leitura liberada para o role `authenticated`. Esta migration mantém RLS
-- HABILITADO com uma policy de SELECT permissiva. O resultado funcional é o
-- mesmo para leitura, mas é estritamente mais seguro: sem RLS, qualquer GRANT
-- concedido por engano (inclusive por um `GRANT ALL ... TO anon` acidental)
-- expõe escrita imediatamente. Com RLS ligado, INSERT/UPDATE/DELETE são
-- barrados mesmo que o GRANT exista.
--
-- A arquitetura deve ser atualizada para refletir esta decisão.

BEGIN;

-- ─────────────────────────────────────────────────────────────────
-- Limpeza do estado divergente
-- ─────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.price_history CASCADE;
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TYPE  IF EXISTS public.quote_provider;
DROP TYPE  IF EXISTS public.asset_type;

-- ─────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────

CREATE TYPE public.asset_type AS ENUM (
  'stock_br',  -- ações brasileiras (B3)
  'fii',       -- fundos de investimento imobiliário
  'bdr',       -- brazilian depositary receipts
  'stock_us',  -- ações norte-americanas
  'reit',      -- real estate investment trusts
  'crypto'     -- criptomoedas
);

-- Provedores de cotação suportados.
-- `ibovfinancials` foi REMOVIDO: espelho não-oficial, sem resposta.
CREATE TYPE public.quote_provider AS ENUM (
  'brapi',       -- B3: ações, FIIs, BDRs. Único com histórico BR + licença clara
  'twelvedata',  -- stocks US e REITs (free: 800 req/dia, US + cripto + forex)
  'coingecko',   -- criptomoedas
  'bcb',         -- Banco Central: PTAX USD/BRL (oficial, sem chave, sem quota)
  'finnhub',     -- ATENÇÃO: só cotação atual. Candles históricos são pagos
  'awesomeapi'   -- ATENÇÃO: apresentou HTTP 429 QuotaExceeded em 2026-09-08
);

-- ─────────────────────────────────────────────────────────────────
-- assets — catálogo de ativos reconhecidos
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE public.assets (
  ticker TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type public.asset_type NOT NULL,
  -- Moeda de cotação. Exigida pela arquitetura; ausente no schema anterior.
  -- Sem ela, exposição internacional e conversão USD dependeriam de inferir
  -- moeda a partir de `type`, o que é implícito e quebra em casos mistos.
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD')),
  quote_provider public.quote_provider NOT NULL,
  -- Símbolo do ativo no provedor, quando difere do ticker interno.
  -- Ex.: BTC -> 'bitcoin' no CoinGecko; PETR4 -> 'PETR4' na brapi.
  provider_symbol TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX assets_type_idx     ON public.assets(type);
CREATE INDEX assets_active_idx   ON public.assets(active) WHERE active;
CREATE INDEX assets_provider_idx ON public.assets(quote_provider);

-- Busca por nome (AC: "usuário consegue buscar ativo por ticker ou nome").
-- Sem índice trigram, `name ILIKE '%termo%'` faz sequential scan.
-- Busca por ticker já é atendida pela primary key.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX assets_name_trgm_idx ON public.assets USING GIN (name gin_trgm_ops);

DROP TRIGGER IF EXISTS set_assets_updated_at ON public.assets;
CREATE TRIGGER set_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- price_history — série diária de fechamentos
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL REFERENCES public.assets(ticker) ON DELETE CASCADE,
  date DATE NOT NULL,
  open  NUMERIC(18, 4),
  high  NUMERIC(18, 4),
  low   NUMERIC(18, 4),
  close NUMERIC(18, 4) NOT NULL,
  -- Fechamento ajustado por proventos e desdobramentos. Necessário para o
  -- retorno total da Story 4.1: sem ajuste, o retorno de ativo pagador de
  -- dividendos aparece subestimado. A brapi já devolve `adjustedClose` de
  -- graça, então coletar agora evita reingerir 12 meses depois.
  adjusted_close NUMERIC(18, 4),
  volume BIGINT,
  -- Procedência da linha (requisito de rastreabilidade do épico).
  -- Esperado: 'brapi' | 'twelvedata' | 'coingecko' | 'bcb' | 'synthetic'.
  -- 'synthetic' marca trechos preenchidos por simulação quando o provedor
  -- não cobre a janela de 12 meses no plano gratuito.
  source TEXT NOT NULL DEFAULT 'seed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ticker, date),
  -- Coerência básica de OHLC. Colunas OHL são opcionais (cripto via
  -- simple/price não as fornece), então só valida quando presentes.
  CONSTRAINT price_history_ohlc_coerente CHECK (
    (high IS NULL OR low IS NULL OR high >= low)
    AND (close > 0)
  )
);

-- Consulta dominante da Story 2.3: "último fechamento deste ticker".
-- DESC na data serve tanto o último ponto quanto a série completa sem sort.
CREATE INDEX price_history_ticker_date_idx ON public.price_history(ticker, date DESC);
CREATE INDEX price_history_date_idx        ON public.price_history(date DESC);

DROP TRIGGER IF EXISTS set_price_history_updated_at ON public.price_history;
CREATE TRIGGER set_price_history_updated_at
  BEFORE UPDATE ON public.price_history
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- RLS: leitura liberada, escrita inexistente para o cliente
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.assets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ativos legiveis por usuario autenticado"
  ON public.assets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Historico legivel por usuario autenticado"
  ON public.price_history FOR SELECT TO authenticated USING (true);

-- Nenhuma policy de INSERT/UPDATE/DELETE: escrita só pelo service role,
-- que ignora RLS por definição (usado pelas Edge Functions e pelo seed).

-- ─────────────────────────────────────────────────────────────────
-- Permissões
-- ─────────────────────────────────────────────────────────────────

-- Revoga o excesso herdado do estado anterior (incluía TRUNCATE, que RLS
-- não intercepta) e também os defaults amplos do schema public do Supabase.
REVOKE ALL ON public.assets        FROM anon, authenticated;
REVOKE ALL ON public.price_history FROM anon, authenticated;

-- `authenticated` só lê. `anon` não recebe nada: todas as rotas do app são
-- protegidas (Story 1.4), então não há leitura pré-login. Se algum dia existir
-- busca pública de ativos, conceder SELECT a anon explicitamente aqui.
GRANT SELECT ON public.assets        TO authenticated;
GRANT SELECT ON public.price_history TO authenticated;

COMMIT;

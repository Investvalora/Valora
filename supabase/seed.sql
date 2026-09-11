-- Seed do catálogo de ativos — Story 2.1
-- Gerado a partir de .backup-supabase-20260908-144055/assets.json, com correções:
--   * provider ibovfinancials (espelho inválido, 27 ativos) -> brapi
--   * provider finnhub -> twelvedata para stock_us/reit: o free do Finnhub não
--     entrega candles históricos, então não serve à janela de 12 meses do AC
--   * provider awesomeapi -> removido junto com o ativo USD-BRL
--   * USD-BRL excluído: estava tipado como 'crypto', o que o faria contar como
--     criptomoeda na exposição internacional (Story 2.4) e permitiria cadastrar
--     posição em moeda. A cotação USD/BRL é responsabilidade do hook (AD-12).
--   * coluna currency preenchida por tipo (BRL para B3/BDR, USD para US/REIT/cripto)
--
-- Idempotente: reexecutar apenas atualiza os metadados do ativo.

INSERT INTO public.assets (ticker, name, type, currency, quote_provider, provider_symbol, active) VALUES
  ('AAPL', 'Apple Inc', 'stock_us'::asset_type, 'USD', 'twelvedata'::quote_provider, 'AAPL', TRUE),
  ('AAPL34', 'Apple BDR', 'bdr'::asset_type, 'BRL', 'brapi'::quote_provider, 'AAPL34', TRUE),
  ('ABEV3', 'Ambev ON', 'stock_br'::asset_type, 'BRL', 'brapi'::quote_provider, 'ABEV3', TRUE),
  ('ADA', 'Cardano', 'crypto'::asset_type, 'USD', 'coingecko'::quote_provider, 'cardano', TRUE),
  ('AMZN', 'Amazon.com Inc', 'stock_us'::asset_type, 'USD', 'twelvedata'::quote_provider, 'AMZN', TRUE),
  ('AMZO34', 'Amazon BDR', 'bdr'::asset_type, 'BRL', 'brapi'::quote_provider, 'AMZO34', TRUE),
  ('BBAS3', 'Banco do Brasil ON', 'stock_br'::asset_type, 'BRL', 'brapi'::quote_provider, 'BBAS3', TRUE),
  ('BBDC4', 'Bradesco PN', 'stock_br'::asset_type, 'BRL', 'brapi'::quote_provider, 'BBDC4', TRUE),
  ('BNB', 'Binance Coin', 'crypto'::asset_type, 'USD', 'coingecko'::quote_provider, 'binancecoin', TRUE),
  ('BRK.B', 'Berkshire Hathaway Class B', 'stock_us'::asset_type, 'USD', 'twelvedata'::quote_provider, 'BRK.B', TRUE),
  ('BTC', 'Bitcoin', 'crypto'::asset_type, 'USD', 'coingecko'::quote_provider, 'bitcoin', TRUE),
  ('BTLG11', 'BTG Pactual Logística', 'fii'::asset_type, 'BRL', 'brapi'::quote_provider, 'BTLG11', TRUE),
  ('CPLE3', 'Copel ON', 'stock_br'::asset_type, 'BRL', 'brapi'::quote_provider, 'CPLE3', TRUE),
  ('DIS', 'Walt Disney Co', 'stock_us'::asset_type, 'USD', 'twelvedata'::quote_provider, 'DIS', TRUE),
  ('AXIA3', 'AXIA Energia ON', 'stock_br'::asset_type, 'BRL', 'brapi'::quote_provider, 'AXIA3', TRUE),
  ('EQIX', 'Equinix Inc', 'reit'::asset_type, 'USD', 'twelvedata'::quote_provider, 'EQIX', TRUE),
  ('ETH', 'Ethereum', 'crypto'::asset_type, 'USD', 'coingecko'::quote_provider, 'ethereum', TRUE),
  ('GGBR4', 'Gerdau PN', 'stock_br'::asset_type, 'BRL', 'brapi'::quote_provider, 'GGBR4', TRUE),
  ('GOGL34', 'Google (Alphabet) BDR', 'bdr'::asset_type, 'BRL', 'brapi'::quote_provider, 'GOGL34', TRUE),
  ('GOOGL', 'Alphabet Inc Class A', 'stock_us'::asset_type, 'USD', 'twelvedata'::quote_provider, 'GOOGL', TRUE),
  ('HGLG11', 'CSHG Logística', 'fii'::asset_type, 'BRL', 'brapi'::quote_provider, 'HGLG11', TRUE),
  ('ITUB4', 'Itaú Unibanco PN', 'stock_br'::asset_type, 'BRL', 'brapi'::quote_provider, 'ITUB4', TRUE),
  ('JNJ', 'Johnson & Johnson', 'stock_us'::asset_type, 'USD', 'twelvedata'::quote_provider, 'JNJ', TRUE),
  ('JPM', 'JPMorgan Chase & Co', 'stock_us'::asset_type, 'USD', 'twelvedata'::quote_provider, 'JPM', TRUE),
  ('KNRI11', 'Kinea Renda Imobiliária', 'fii'::asset_type, 'BRL', 'brapi'::quote_provider, 'KNRI11', TRUE),
  ('META', 'Meta Platforms Inc', 'stock_us'::asset_type, 'USD', 'twelvedata'::quote_provider, 'META', TRUE),
  ('MGLU3', 'Magazine Luiza ON', 'stock_br'::asset_type, 'BRL', 'brapi'::quote_provider, 'MGLU3', TRUE),
  ('MSFT', 'Microsoft Corporation', 'stock_us'::asset_type, 'USD', 'twelvedata'::quote_provider, 'MSFT', TRUE),
  ('MSFT34', 'Microsoft BDR', 'bdr'::asset_type, 'BRL', 'brapi'::quote_provider, 'MSFT34', TRUE),
  ('MXRF11', 'Maxi Renda', 'fii'::asset_type, 'BRL', 'brapi'::quote_provider, 'MXRF11', TRUE),
  ('NVDA', 'NVIDIA Corporation', 'stock_us'::asset_type, 'USD', 'twelvedata'::quote_provider, 'NVDA', TRUE),
  ('O', 'Realty Income Corp', 'reit'::asset_type, 'USD', 'twelvedata'::quote_provider, 'O', TRUE),
  ('PETR4', 'Petrobras PN', 'stock_br'::asset_type, 'BRL', 'brapi'::quote_provider, 'PETR4', TRUE),
  ('PG', 'Procter & Gamble Co', 'stock_us'::asset_type, 'USD', 'twelvedata'::quote_provider, 'PG', TRUE),
  ('PLD', 'Prologis Inc', 'reit'::asset_type, 'USD', 'twelvedata'::quote_provider, 'PLD', TRUE),
  ('PVBI11', 'VBI Prime Properties', 'fii'::asset_type, 'BRL', 'brapi'::quote_provider, 'PVBI11', TRUE),
  ('RENT3', 'Localiza ON', 'stock_br'::asset_type, 'BRL', 'brapi'::quote_provider, 'RENT3', TRUE),
  ('SANB11', 'Santander BR Units', 'stock_br'::asset_type, 'BRL', 'brapi'::quote_provider, 'SANB11', TRUE),
  ('SOL', 'Solana', 'crypto'::asset_type, 'USD', 'coingecko'::quote_provider, 'solana', TRUE),
  ('SPG', 'Simon Property Group', 'reit'::asset_type, 'USD', 'twelvedata'::quote_provider, 'SPG', TRUE),
  ('TSLA', 'Tesla Inc', 'stock_us'::asset_type, 'USD', 'twelvedata'::quote_provider, 'TSLA', TRUE),
  ('TSLA34', 'Tesla BDR', 'bdr'::asset_type, 'BRL', 'brapi'::quote_provider, 'TSLA34', TRUE),
  ('V', 'Visa Inc', 'stock_us'::asset_type, 'USD', 'twelvedata'::quote_provider, 'V', TRUE),
  ('VALE3', 'Vale ON', 'stock_br'::asset_type, 'BRL', 'brapi'::quote_provider, 'VALE3', TRUE),
  ('VILG11', 'Vinci Logística', 'fii'::asset_type, 'BRL', 'brapi'::quote_provider, 'VILG11', TRUE),
  ('VISC11', 'Vinci Shopping Centers', 'fii'::asset_type, 'BRL', 'brapi'::quote_provider, 'VISC11', TRUE),
  ('VIVT3', 'Telefônica Brasil ON', 'stock_br'::asset_type, 'BRL', 'brapi'::quote_provider, 'VIVT3', TRUE),
  ('WEGE3', 'WEG ON', 'stock_br'::asset_type, 'BRL', 'brapi'::quote_provider, 'WEGE3', TRUE),
  ('WMT', 'Walmart Inc', 'stock_us'::asset_type, 'USD', 'twelvedata'::quote_provider, 'WMT', TRUE),
  ('XPML11', 'XP Malls', 'fii'::asset_type, 'BRL', 'brapi'::quote_provider, 'XPML11', TRUE),
  ('XRP', 'Ripple', 'crypto'::asset_type, 'USD', 'coingecko'::quote_provider, 'ripple', TRUE)
ON CONFLICT (ticker) DO UPDATE SET
  name = EXCLUDED.name, type = EXCLUDED.type, currency = EXCLUDED.currency,
  quote_provider = EXCLUDED.quote_provider, provider_symbol = EXCLUDED.provider_symbol,
  active = EXCLUDED.active;

-- Proventos e fundamentos simulados: quatro trimestres fechados, sem rede.
-- Os valores derivam da posição alfabética do ticker e do trimestre, portanto
-- permanecem estáveis entre execuções e ambientes.
WITH periods(reference_date, period_no) AS (
  VALUES
    (DATE '2025-03-31', 1),
    (DATE '2025-06-30', 2),
    (DATE '2025-09-30', 3),
    (DATE '2025-12-31', 4)
),
asset_order AS (
  SELECT ticker, type, abs(mod(hashtextextended(ticker, 0)::NUMERIC, 1000000)) AS asset_no
  FROM public.assets
)
INSERT INTO public.dividends (ticker, ex_date, payment_date, value_per_share, type, source)
SELECT
  asset_order.ticker,
  periods.reference_date - 16,
  periods.reference_date - 2,
  round((0.08 + (asset_order.asset_no % 9) * 0.02 + periods.period_no * 0.01)::NUMERIC, 6),
  CASE WHEN asset_order.type = 'fii' THEN 'jcp' ELSE 'dividend' END,
  'seed'
FROM asset_order
CROSS JOIN periods
WHERE asset_order.type <> 'crypto'
ON CONFLICT (ticker, ex_date, type) DO UPDATE SET
  payment_date = EXCLUDED.payment_date,
  value_per_share = EXCLUDED.value_per_share,
  source = EXCLUDED.source
WHERE public.dividends.source = 'seed';

WITH periods(reference_date, period_no) AS (
  VALUES
    (DATE '2025-03-31', 1),
    (DATE '2025-06-30', 2),
    (DATE '2025-09-30', 3),
    (DATE '2025-12-31', 4)
),
asset_order AS (
  SELECT ticker, abs(mod(hashtextextended(ticker, 0)::NUMERIC, 1000000)) AS asset_no
  FROM public.assets
)
INSERT INTO public.fundamentals (
  ticker, reference_date, pl, pvp, roe, dy, debt_equity, net_margin, lpa, vpa, source
)
SELECT
  asset_order.ticker,
  periods.reference_date,
  round((5 + (asset_order.asset_no % 17) + periods.period_no * 0.25)::NUMERIC, 4),
  round((0.7 + (asset_order.asset_no % 8) * 0.12)::NUMERIC, 4),
  round((6 + (asset_order.asset_no % 15) + periods.period_no * 0.4)::NUMERIC, 4),
  round((2 + (asset_order.asset_no % 10) * 0.35)::NUMERIC, 4),
  round((0.2 + (asset_order.asset_no % 12) * 0.08)::NUMERIC, 4),
  round((4 + (asset_order.asset_no % 18) * 0.8)::NUMERIC, 4),
  round((0.5 + (asset_order.asset_no % 13) * 0.18 + periods.period_no * 0.02)::NUMERIC, 4),
  round((4 + (asset_order.asset_no % 20) * 0.7)::NUMERIC, 4),
  'seed'
FROM asset_order
CROSS JOIN periods
ON CONFLICT (ticker, reference_date) DO UPDATE SET
  pl = EXCLUDED.pl,
  pvp = EXCLUDED.pvp,
  roe = EXCLUDED.roe,
  dy = EXCLUDED.dy,
  debt_equity = EXCLUDED.debt_equity,
  net_margin = EXCLUDED.net_margin,
  lpa = EXCLUDED.lpa,
  vpa = EXCLUDED.vpa,
  source = EXCLUDED.source
WHERE public.fundamentals.source = 'seed';

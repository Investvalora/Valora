// Edge Function: fetch-dividends-yahoo
//
// Busca o histórico de proventos dos últimos 12 meses de um ticker via Yahoo
// Finance (gratuito, sem chave de API). Retorna os dados formatados para o
// cálculo Bazin — sem persistir nada no banco (on-demand, por ticker).
//
// Para ativos BR, acrescenta o sufixo ".SA" ao ticker antes de consultar o
// Yahoo. Para ativos US e cripto, usa o ticker diretamente.
//
// REQUEST
//   POST /functions/v1/fetch-dividends-yahoo
//   Body: { "ticker": "MXRF11", "currency": "BRL" }
//   Auth: Bearer <user JWT>  (verify_jwt = true)
//
// RESPONSE 200
//   {
//     "ticker": "MXRF11",
//     "annualDividend": 1.20,        -- soma dos pagamentos dos últimos 12 meses
//     "payments": [                  -- array detalhado para auditoria
//       { "date": "2026-09-01", "amount": 0.10 },
//       ...
//     ],
//     "source": "yahoo"
//   }
//
// RESPONSE 404 — ticker não encontrado no Yahoo
// RESPONSE 400 — body inválido
// RESPONSE 500 — erro interno / timeout
//
// VARIÁVEIS DE AMBIENTE
//   Nenhuma — Yahoo Finance não requer chave de API.
//
// PADRÃO DO PROJETO (ver supabase/functions/README.md)
//   Sem @supabase/supabase-js. verify_jwt = true com autenticação manual.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'
const FETCH_TIMEOUT_MS = 15_000
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Tipos de ativo BR que precisam do sufixo .SA
// Inferido pelo sufixo numérico do ticker (mesmo padrão de lookup-asset)
function needsSaSuffix(ticker: string): boolean {
  // Tickers US/cripto não têm sufixo numérico típico da B3
  // ou já contêm ponto (BRK.B)
  if (ticker.includes('.')) return false
  // Tickers BR terminam com dígito(s): PETR4, MXRF11, BBAS3, WEGE3...
  return /\d$/.test(ticker)
}

function yahooSymbol(ticker: string, currency: string): string {
  if (currency === 'USD') return ticker
  if (needsSaSuffix(ticker)) return `${ticker}.SA`
  return ticker
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function authenticatedUser(request: Request): Promise<string | null> {
  const authorization = request.headers.get('authorization')
  if (!authorization || !SUPABASE_URL || !SERVICE_KEY) return null
  const result = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: authorization },
  })
  if (!result.ok) return null
  const user = await result.json()
  return typeof user?.id === 'string' ? user.id : null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const userId = await authenticatedUser(req)
  if (!userId) return json({ error: 'Autenticação necessária.' }, 401)

  // Parse do body
  let ticker: string
  let currency: string
  try {
    const body = await req.json() as { ticker?: unknown; currency?: unknown }
    if (typeof body?.ticker !== 'string' || !body.ticker.trim()) {
      return json({ error: 'Campo "ticker" é obrigatório.' }, 400)
    }
    ticker = body.ticker.trim().toUpperCase()
    currency = typeof body.currency === 'string' ? body.currency.toUpperCase() : 'BRL'
  } catch {
    return json({ error: 'Body inválido.' }, 400)
  }

  const symbol = yahooSymbol(ticker, currency)
  const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?events=dividends&range=1y&interval=1d`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Valora/1.0)',
        'Accept': 'application/json',
      },
    })
    clearTimeout(timer)

    if (!resp.ok) {
      return json({ error: `Yahoo retornou status ${resp.status} para ${symbol}.` }, 502)
    }

    const data = await resp.json() as {
      chart: {
        result: Array<{
          events?: {
            dividends?: Record<string, { date: number; amount: number }>
          }
        }> | null
        error?: { code: string; description: string }
      }
    }

    // Ticker não encontrado no Yahoo
    if (data.chart.error || !data.chart.result?.[0]) {
      return json({ error: `Ativo ${ticker} não encontrado no Yahoo Finance.` }, 404)
    }

    const dividendsRaw = data.chart.result[0].events?.dividends ?? {}
    const payments: Array<{ date: string; amount: number }> = []

    for (const entry of Object.values(dividendsRaw)) {
      const amount = Number(entry.amount)
      if (!Number.isFinite(amount) || amount <= 0) continue
      const date = new Date(entry.date * 1000).toISOString().slice(0, 10)
      payments.push({ date, amount })
    }

    // Ordenar por data decrescente
    payments.sort((a, b) => b.date.localeCompare(a.date))

    const annualDividend = payments.reduce((sum, p) => sum + p.amount, 0)

    return json({
      ticker,
      symbol,
      annualDividend: Math.round(annualDividend * 1_000_000) / 1_000_000,
      payments,
      source: 'yahoo',
    })
  } catch (err) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : 'Erro desconhecido.'
    return json({ error: `Falha ao consultar Yahoo Finance: ${msg}` }, 500)
  }
})

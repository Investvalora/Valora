// Edge Function: check-price-targets
// Verifica alertas de preço-alvo ativos do usuário autenticado e dispara
// (status → 'novo') aqueles cuja condição foi satisfeita pela cotação mais recente.
//
// Padrões do projeto (ver supabase/functions/README.md):
// - Sem @supabase/supabase-js (causa BOOT_ERROR neste runtime)
// - verify_jwt=false — autenticação manual via authenticatedUser()
// - Chamadas ao banco via fetch direto ao PostgREST

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function rest(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
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

type PriceTargetAlert = {
  id: string
  ticker: string
  target_price: number
  condition: 'above' | 'below'
  status: string
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return response({ error: 'Método não permitido.' }, 405)

  const userId = await authenticatedUser(request)
  if (!userId) return response({ error: 'Autenticação necessária.' }, 401)

  try {
    // 1. Buscar alertas price_target ativos (novo ou lido) do usuário
    const alertsRes = await rest(
      `alerts?user_id=eq.${userId}&type=eq.price_target&status=in.(novo,lido)&select=id,ticker,target_price,condition,status`,
    )
    if (!alertsRes.ok) throw new Error('Falha ao ler alertas de preço-alvo.')

    const priceTargets = (await alertsRes.json()) as PriceTargetAlert[]
    if (priceTargets.length === 0) return response({ triggered: 0 })

    // 2. Buscar cotação mais recente de cada ticker único
    const tickers = [...new Set(priceTargets.map((a) => a.ticker))]
    const quoteByTicker = new Map<string, number>()

    for (const ticker of tickers) {
      const quoteRes = await rest(
        `price_history?ticker=eq.${ticker}&select=close&order=date.desc&limit=1`,
      )
      if (!quoteRes.ok) continue
      const [row] = (await quoteRes.json()) as Array<{ close: number }>
      if (row && typeof row.close === 'number' && row.close > 0) {
        quoteByTicker.set(ticker, row.close)
      }
    }

    // 3. Para cada alerta, verificar se a condição foi satisfeita
    let triggered = 0

    for (const alert of priceTargets) {
      const close = quoteByTicker.get(alert.ticker)
      if (close === undefined) continue // sem cotação — skip silencioso

      const targetPrice = Number(alert.target_price)
      const conditionMet =
        (alert.condition === 'below' && close <= targetPrice) ||
        (alert.condition === 'above' && close >= targetPrice)

      // Só dispara se ainda não está 'novo' (evita atualização desnecessária)
      if (conditionMet && alert.status !== 'novo') {
        const updateRes = await rest(`alerts?id=eq.${alert.id}&user_id=eq.${userId}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'novo' }),
        })
        if (updateRes.ok) triggered++
      }
    }

    return response({ triggered })
  } catch (error) {
    return response(
      { error: error instanceof Error ? error.message : 'Falha ao verificar preços-alvo.' },
      500,
    )
  }
})

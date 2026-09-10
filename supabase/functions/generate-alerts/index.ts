const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

import { findAlertCandidates } from './logic.ts'

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

async function authenticatedUser(request: Request) {
  const authorization = request.headers.get('authorization')
  if (!authorization || !SUPABASE_URL || !SERVICE_KEY) return null

  const result = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: authorization },
  })
  if (!result.ok) return null

  const user = await result.json()
  return typeof user?.id === 'string' ? user.id : null
}

async function insertAlert(userId: string, payload: Record<string, unknown>) {
  const existing = await rest(
    `alerts?user_id=eq.${userId}&type=eq.${payload.type}&ticker=eq.${payload.ticker}&status=neq.ignorado&select=id&limit=1`,
  )
  if (!existing.ok) throw new Error('Não foi possível consultar alertas existentes.')
  if ((await existing.json()).length > 0) return false

  const created = await rest('alerts', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: userId, ...payload }),
  })
  if (created.ok) return true
  if (created.status === 409) return false
  throw new Error('Não foi possível criar o alerta.')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return response({ error: 'Método não permitido.' }, 405)

  const userId = await authenticatedUser(request)
  if (!userId) return response({ error: 'Autenticação necessária.' }, 401)

  try {
    const positionsResponse = await rest(`positions?user_id=eq.${userId}&select=ticker`)
    const transactionsResponse = await rest(`transactions?user_id=eq.${userId}&select=ticker`)
    if (!positionsResponse.ok || !transactionsResponse.ok) throw new Error('Falha ao ler a carteira.')

    const positions = (await positionsResponse.json()) as Array<{ ticker: string }>
    const transactions = (await transactionsResponse.json()) as Array<{ ticker: string }>
    const quotes: Array<{ ticker: string; date: string }> = []
    let created = 0

    for (const position of positions) {
      const quoteResponse = await rest(
        `price_history?ticker=eq.${position.ticker}&select=ticker,date&order=date.desc&limit=1`,
      )
      if (!quoteResponse.ok) throw new Error('Falha ao ler cotações.')
      const [quote] = (await quoteResponse.json()) as Array<{ ticker: string; date: string }>
      if (quote) quotes.push(quote)
    }

    for (const candidate of findAlertCandidates(positions, transactions, quotes)) {
      created += Number(
        await insertAlert(userId, {
          ...candidate,
          status: 'novo',
        }),
      )
    }

    return response({ created, positions: positions.length })
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : 'Falha ao gerar alertas.' }, 500)
  }
})
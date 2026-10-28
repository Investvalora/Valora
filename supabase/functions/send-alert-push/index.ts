// Chamado apenas pelo trigger de alerts, com a service role key do Vault.
// Envia uma mensagem genérica para não expor dados da carteira na tela bloqueada.
import webpush from 'npm:web-push@3.6.7'
import { authorizePush } from './authorization.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? ''

type Alert = { user_id: string; status: string }
type Subscription = { id: string; endpoint: string; p256dh: string; auth: string }

function rest(path: string, init: RequestInit = {}) {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

function isPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false
    const host = url.hostname.toLowerCase()
    return host === 'fcm.googleapis.com' ||
      host === 'updates.push.services.mozilla.com' ||
      host === 'web.push.apple.com' ||
      host.endsWith('.push.apple.com') ||
      host.endsWith('.notify.windows.com')
  } catch {
    return false
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return Response.json({ error: 'Método não permitido.' }, { status: 405 })
  const authorization = request.headers.get('authorization')
  const authorized = await authorizePush(authorization, serviceKey, async digest => {
    const result = await rest('rpc/authorize_alert_push', {
      method: 'POST', body: JSON.stringify({ token_digest: digest }), signal: AbortSignal.timeout(10000),
    })
    return result.ok && await result.json() === true
  })
  if (!authorized) {
    console.warn(JSON.stringify({ event: 'push_auth_denied' }))
    return Response.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  if (!supabaseUrl || !vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return Response.json({ error: 'Configuração de push ausente.' }, { status: 503 })
  }

  let alertId: unknown
  try {
    alertId = (await request.json()).alert_id
  } catch {
    return Response.json({ error: 'JSON inválido.' }, { status: 400 })
  }
  if (typeof alertId !== 'string' || !/^[0-9a-f-]{36}$/i.test(alertId)) {
    return Response.json({ error: 'Alerta inválido.' }, { status: 400 })
  }

  try {
    const alertResponse = await rest(`alerts?id=eq.${alertId}&select=user_id,status&limit=1`)
    if (!alertResponse.ok) throw new Error('Falha ao consultar alerta.')
    const [alert] = (await alertResponse.json()) as Alert[]
    if (!alert || alert.status !== 'novo') return Response.json({ sent: 0 })

    const subscriptionsResponse = await rest(
      `push_subscriptions?user_id=eq.${alert.user_id}&select=id,endpoint,p256dh,auth`,
    )
    if (!subscriptionsResponse.ok) throw new Error('Falha ao consultar inscrições.')
    const subscriptions = (await subscriptionsResponse.json()) as Subscription[]

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
    const payload = JSON.stringify({
      title: 'Novo alerta no Valora',
      body: 'Abra o app para conferir seus alertas.',
      url: '/alertas',
      tag: `alert-${alertId}`,
    })

    let sent = 0
    let failed = 0
    for (const subscription of subscriptions) {
      if (!isPushEndpoint(subscription.endpoint)) {
        failed++
        continue
      }
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, payload, { timeout: 10000 })
        sent++
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await rest(`push_subscriptions?id=eq.${subscription.id}`, { method: 'DELETE' })
        }
        failed++
      }
    }
    return Response.json({ sent, failed })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Falha ao enviar push.' },
      { status: 500 },
    )
  }
})

const CACHE_NAME = 'valora-static-v1'
const APP_SHELL = ['/index.html']
const CACHE_PREFIX = 'valora-static-'

function validStaticResponse(request, response) {
  if (!response || !response.ok) return false
  const pathname = new URL(typeof request === 'string' ? request : request.url, self.location.origin).pathname
  const type = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  if (pathname.endsWith('.js') || pathname.endsWith('.mjs')) {
    return ['application/javascript', 'text/javascript', 'application/ecmascript', 'text/ecmascript'].includes(type)
  }
  if (pathname.endsWith('.css')) return type === 'text/css'
  if (pathname.endsWith('.html')) return type === 'text/html'
  if (/\.(png|jpe?g|webp|gif|svg|ico)$/.test(pathname)) return type.startsWith('image/')
  return type !== 'text/html'
}

async function precache() {
  // Validate the entire shell before writing or replacing the active worker.
  const responses = await Promise.all(APP_SHELL.map(async (url) => {
    const response = await fetch(new URL(url, self.location.origin).href, { cache: 'reload' })
    if (!validStaticResponse(url, response)) throw new Error(`Invalid PWA asset: ${url}`)
    return response
  }))
  const cache = await caches.open(CACHE_NAME)
  await Promise.all(APP_SHELL.map((url, index) => cache.put(url, responses[index])))
  await self.skipWaiting()
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names
        .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map((name) => caches.delete(name)),
    )),
  )
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        return (await cache.match('/index.html')) ?? Response.error()
      }),
    )
    return
  }

  if (url.pathname.startsWith('/icons/')) {
    // Os ícones mantêm o mesmo nome no Vite; use a versão nova durante o
    // desenvolvimento e recorra ao cache quando a rede estiver indisponível.
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)
        try {
          const response = await fetch(request, { cache: 'reload' })
          if (validStaticResponse(request, response)) {
            // Storage quota must not turn a successful download into a failure.
            try { await cache.put(request, response.clone()) } catch { /* best effort */ }
            return response
          }
        } catch { /* recover from the current version only */ }
        const cached = await cache.match(request)
        if (validStaticResponse(request, cached)) return cached
        if (cached) await cache.delete(request)
        return Response.error()
      })(),
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME)
        const cached = await cache.match(request)
        if (validStaticResponse(request, cached)) return cached
        if (cached) await cache.delete(request)
        // Bypass a possibly poisoned HTTP cache as well as Cache Storage.
        const response = await fetch(request, { cache: 'reload' })
        if (!validStaticResponse(request, response)) return Response.error()
        try { await cache.put(request, response.clone()) } catch { /* cache is optional after download */ }
        return response
      })(),
    )
  }
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    // Uma mensagem inválida ainda gera um aviso visível.
  }
  event.waitUntil(self.registration.showNotification('Novo alerta no Valora', {
    body: 'Abra o app para conferir seus alertas.',
    icon: '/icons/valora-192.png',
    badge: '/icons/valora-192.png',
    tag: typeof data.tag === 'string' ? data.tag : 'valora-alert',
    data: { url: '/alertas' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const url = new URL('/alertas', self.location.origin).href
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    // Prefer a visible app and recover from stale or unfocusable clients.
    const candidates = windows.filter((client) => new URL(client.url).origin === self.location.origin)
      .sort((a, b) => Number(b.visibilityState === 'visible') - Number(a.visibilityState === 'visible'))
    for (const client of candidates) {
      try {
        // Focusing first preserves the notification's user activation on Android.
        const focused = await client.focus()
        const navigated = await focused.navigate(url)
        if (navigated) return
      } catch {
        // The browser may have discarded this client; try another or open a window.
      }
    }
    await self.clients.openWindow(url)
  })())
})

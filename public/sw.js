const CACHE_NAME = 'valora-static-v1'
const APP_SHELL = ['/index.html']
const CACHE_PREFIX = 'valora-static-'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
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
      fetch(request).then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(request, response.clone())
        }
        return response
      }).catch(async () => (await caches.match(request)) ?? Response.error()),
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(request, response.clone())
        }
        return response
      }),
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
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin)
    if (existing) {
      await existing.navigate(url)
      await existing.focus()
      return
    }
    await self.clients.openWindow(url)
  })())
})

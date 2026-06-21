/**
 * App-shell service worker for offline support.
 *
 * Strategy: stale-while-revalidate for same-origin GET requests. The app shell
 * (HTML + hashed JS/CSS) is served from cache instantly and refreshed in the
 * background, so the app opens even with no/poor connection (common while
 * travelling). Cross-origin requests (Google Maps tiles/SDK) are left untouched
 * — they're not cached, per Maps ToS, and need the network.
 */
const CACHE = 'travel-diary-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // don't touch Google Maps etc.

  // Network-first for the HTML document so a new deploy shows up immediately
  // when online (cache is only a fallback for offline). This avoids the
  // "stuck on an old version" problem the previous cache-first SW caused.
  const isHTML = req.mode === 'navigate' || req.destination === 'document'
  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put(req, copy))
          return res
        })
        .catch(() => caches.match(req))
    )
    return
  }

  // Hashed assets are immutable — cache-first, revalidate in background.
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(req)
      const network = fetch(req)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})

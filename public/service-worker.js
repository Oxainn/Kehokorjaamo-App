// Vaihe B Pala B9b — Service Worker (network-first)
//
// Strategia: yritä ensin verkkoa, fallback selaimen omaan välimuistiin.
// Tämä takaa että online ollessa käyttäjä saa aina tuoreimman version
// (ei stale-cache-ongelmia uusiin deployhin), mutta offline tilassa
// app-shelli avautuu silti.
//
// HUOM: cachetaan vain saman originin GET-pyynnöt. POST-pyynnöt (Supabase
// REST + Edge Function -kutsut) eivät kierrä SW:n läpi — frontend hoitaa
// offline-jonon (offlineDB + offlineSync).

const CACHE = 'kehokorjaamo-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Siivoa vanhat versiot
    const avaimet = await caches.keys()
    await Promise.all(avaimet.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  // Älä cachea hot-update-pyyntöjä devissä
  if (url.pathname.startsWith('/@vite/')) return
  if (url.pathname.includes('/__vite_ping')) return

  e.respondWith((async () => {
    try {
      const verkko = await fetch(req)
      // Tallenna kopio cacheen taustalla
      const kopio  = verkko.clone()
      caches.open(CACHE).then((c) => c.put(req, kopio)).catch(() => {})
      return verkko
    } catch {
      const cached = await caches.match(req)
      if (cached) return cached
      // SPA-fallback — palauta index.html navigointipyyntöihin
      if (req.mode === 'navigate') {
        const indexFallback = await caches.match('/index.html')
        if (indexFallback) return indexFallback
      }
      return Response.error()
    }
  })())
})

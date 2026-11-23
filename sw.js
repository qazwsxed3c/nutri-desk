/* NutriDesk service worker: офлайн-оболочка и кеш статики. */
const CACHE = 'nutridesk-v2'
const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/core/format.js',
  './js/core/nutrition.js',
  './js/core/store.js',
  './js/data/foods.js',
  './js/data/labs.js',
  './js/data/meal-templates.js',
  './js/ui/charts.js',
  './js/ui/components.js',
  './js/ui/forms.js',
  './js/ui/shared.js',
  './js/ui/views/advice.js',
  './js/ui/views/analysis.js',
  './js/ui/views/anamnesis.js',
  './js/ui/views/clients.js',
  './js/ui/views/diary.js',
  './js/ui/views/labs.js',
  './js/ui/views/overview.js',
  './js/ui/views/plan.js',
  './js/ui/views/results.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch((error) => console.warn('SW install:', error)),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy)).catch(() => {})
          return response
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match('./index.html'))),
    )
    return
  }

  // Код приложения обновляется по сети, кеш — только запасной вариант для офлайна.
  if (/\.(?:js|mjs|css|json|webmanifest|md)$/.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
          }
          return response
        })
        .catch(() => caches.match(request)),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
        }
        return response
      })
    }),
  )
})

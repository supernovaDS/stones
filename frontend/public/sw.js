const CACHE_NAME = "stones-offline-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/stones_logo_2.png",
  "/manifest.webmanifest"
];

// Helper: Check if request is an API, database, authentication, or external cloud request
function isBackendOrApiRequest(url) {
  return (
    url.hostname.includes("supabase") ||
    url.pathname.includes("/rest/v1") ||
    url.pathname.includes("/auth/v1") ||
    url.pathname.includes("/storage/v1") ||
    url.hostname.includes("open-meteo.com")
  );
}

// ── Install: Pre-cache core shell assets ──────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: Immediately clear older caches & claim clients ─────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch Event Interceptor ──────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. NEVER INTERCEPT non-GET, Chrome extension, API, or Supabase requests.
  //    All cloud data sync & database operations pass straight to the network!
  if (request.method !== "GET" || !url.protocol.startsWith("http") || isBackendOrApiRequest(url)) {
    return; // Passthrough directly to network
  }

  // 2. Navigation / HTML Requests: NETWORK-FIRST
  //    Always fetch fresh HTML when online so user gets latest code & data.
  //    Only fall back to cached HTML when completely offline.
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.match("/index.html").then((cachedPage) => {
            return cachedPage || caches.match("/");
          });
        })
    );
    return;
  }

  // 3. Static Assets (JS, CSS, Images, Manifest): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch update in background when online to refresh static bundle
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          })
          .catch(() => {/* Ignore network errors when offline */});
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request);
        });
    })
  );
});

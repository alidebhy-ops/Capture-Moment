const CACHE_NAME = "capturemoment-shell-v3";
const STATIC_SHELL = [
  "/favicon.ico",
  "/pwa-192.png",
  "/pwa-512.png",
];

async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(STATIC_SHELL);

  for (const path of ["/offline", "/login"]) {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) continue;
    await cache.put(path, response.clone());
    const html = await response.text();
    const assetPaths = [
      ...new Set(
        [...html.matchAll(/(?:src|href)="([^"]*\/_next\/static\/[^"]+)"/g)]
          .map((match) => new URL(match[1], self.location.origin).pathname)
      ),
    ];
    await Promise.allSettled(
      assetPaths.map((assetPath) => cache.add(assetPath))
    );
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    precacheShell().then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Data keluarga dan media privat selalu melewati server, tidak disimpan di cache PWA.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match("/offline");
        return cached || Response.error();
      })
    );
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/demo/") ||
    ["/favicon.ico", "/og.jpg", "/pwa-192.png", "/pwa-512.png"].includes(
      url.pathname
    );

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fresh = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              void caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached || Response.error());
        return cached || fresh;
      })
    );
  }
});

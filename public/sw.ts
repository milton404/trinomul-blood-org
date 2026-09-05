// @ts-nocheck

const CACHE_NAMES = {
  static: "trinomul-static-v5",
  images: "trinomul-images-v5",
  api: "trinomul-api-v5",
  fonts: "trinomul-fonts-v5",
  tiles: "trinomul-map-tiles-v5",
};

// Map tile servers (OpenStreetMap street tiles + Esri satellite imagery).
// Tiles are immutable per z/x/y coordinate, so they are safe to cache
// long-term. Caching enables offline map viewing for areas the user has
// previously browsed — critical for low-connectivity regions of Rangpur.
const TILE_HOSTS = [
  "tile.openstreetmap.org",
  "a.tile.openstreetmap.org",
  "b.tile.openstreetmap.org",
  "c.tile.openstreetmap.org",
  "server.arcgisonline.com",
];

if ((self as any).__SW_MANIFEST) {
  const CACHE = "trinomul-precache-v5";
  self.addEventListener("install", (event: any) => {
    event.waitUntil(
      caches
        .open(CACHE)
        .then((cache) => cache.addAll((self as any).__SW_MANIFEST)),
    );
  });
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET") return;

  // Cross-origin: cache OpenStreetMap map tiles with stale-while-revalidate.
  // Tiles are served from cache instantly (offline-friendly), and a network
  // refresh runs in the background to keep the tile store fresh. A cap is
  // enforced to prevent unbounded growth during heavy panning.
  if (TILE_HOSTS.includes(url.host)) {
    event.respondWith(
      caches.open(CACHE_NAMES.tiles).then(async (cache) => {
        const cached = await cache.match(event.request);
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
              // Best-effort eviction: if the tile cache grows large, drop the
              // oldest entries. Keeps storage bounded on low-end devices.
              cache.keys().then((keys) => {
                if (keys.length > 600) {
                  // Remove ~20% of the oldest cached tiles.
                  const toEvict = keys.slice(0, 120);
                  toEvict.forEach((key) => cache.delete(key));
                }
              });
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      }),
    );
    return;
  }

  if (!url.origin.includes(self.location.origin)) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      caches.open(CACHE_NAMES.api).then(async (cache) => {
        try {
          const response = await fetch(event.request);
          if (response.ok) await cache.put(event.request, response.clone());
          return response;
        } catch {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: "Offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
      }),
    );
    return;
  }

  if (url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|avif|ico)$/)) {
    event.respondWith(
      caches.open(CACHE_NAMES.images).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
          return cached || fetchPromise;
        }),
      ),
    );
    return;
  }

  if (url.pathname.match(/\.(woff|woff2|ttf|otf|eot)$/)) {
    event.respondWith(
      caches.open(CACHE_NAMES.fonts).then((cache) =>
        cache.match(event.request).then(
          (cached) =>
            cached ||
            fetch(event.request).then((response) => {
              if (response.ok) cache.put(event.request, response.clone());
              return response;
            }),
        ),
      ),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAMES.static).then(async (cache) => {
      try {
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(event.request);
        return cached || new Response("Offline", { status: 503 });
      }
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.includes("-v1") || k.includes("-v2") || k.includes("-v3") || k.includes("-v4") || k.includes("-v0"))
          .map((k) => caches.delete(k)),
      );
      await clients.claim();
    })(),
  );
});

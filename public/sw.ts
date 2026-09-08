// @ts-nocheck

const CACHE_NAMES = {
  static: "trinomul-static-v6",
  images: "trinomul-images-v6",
  api: "trinomul-api-v6",
  fonts: "trinomul-fonts-v6",
  tiles: "trinomul-map-tiles-v6",
};

const TILE_HOSTS = [
  "tile.openstreetmap.org",
  "a.tile.openstreetmap.org",
  "b.tile.openstreetmap.org",
  "c.tile.openstreetmap.org",
  "server.arcgisonline.com",
];

if ((self as any).__SW_MANIFEST) {
  const CACHE = "trinomul-precache-v6";
  self.addEventListener("install", (event: any) => {
    event.waitUntil(
      caches
        .open(CACHE)
        .then((cache) => cache.addAll((self as any).__SW_MANIFEST)),
    );
  });
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET") return;

  if (TILE_HOSTS.includes(url.host)) {
    event.respondWith(
      caches.open(CACHE_NAMES.tiles).then(async (cache) => {
        const cached = await cache.match(event.request);
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
              cache.keys().then((keys) => {
                if (keys.length > 600) {
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

  if (url.pathname.startsWith("/_next/data/")) {
    event.respondWith(fetch(event.request));
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

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE_NAMES.static).then((cache) =>
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
          .filter((k) => k.includes("-v1") || k.includes("-v2") || k.includes("-v3") || k.includes("-v4") || k.includes("-v5") || k.includes("-v0"))
          .map((k) => caches.delete(k)),
      );
      await clients.claim();
    })(),
  );
});

// ── Web Push notifications (PWA) ─────────────────────────────────────
self.addEventListener("push", (event) => {
  let data: any = { title: "Trinomul Blood Bank", body: "", url: "/feed", tag: "default" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    try {
      if (event.data) data.body = event.data.text();
    } catch {
      /* ignore */
    }
  }
  event.waitUntil(
    (self as any).registration.showNotification(data.title, {
      body: data.body,
      icon: "/android-chrome-192x192.png",
      badge: "/android-chrome-192x192.png",
      tag: data.tag || "default",
      data: { url: data.url || "/feed" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/feed";
  event.waitUntil(
    (self as any).clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList: any[]) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        if ((self as any).clients.openWindow) {
          return (self as any).clients.openWindow(targetUrl);
        }
      }),
  );
});

/*
 * PocketFlow service worker — offline support for the app shell.
 * - Pages: network-first, falling back to the cached copy (query string ignored).
 * - /_next/static and icons: cache-first (file names are content-hashed).
 * - Other same-origin GETs: stale-while-revalidate.
 * - Cross-origin requests (Supabase) are never cached.
 * Bump VERSION to force old caches to be dropped.
 */
const VERSION = "v2";
const CACHE = `pocketflow-${VERSION}`;
const ROUTES = ["/", "/welcome", "/onboarding", "/auth", "/reset-password", "/expenses", "/savings", "/history", "/settings", "/category", "/month"];
const ASSETS = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"];

/** Caches a page and the hashed JS/CSS it references, so every screen works offline after install. */
async function precachePage(cache, url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return;
  const html = await res.clone().text();
  await cache.put(url, res);
  const assets = new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) ?? []);
  await Promise.all(
    [...assets].map((a) =>
      cache.match(a).then((hit) => hit ?? fetch(a).then((r) => (r.ok ? cache.put(a, r) : undefined))).catch(() => undefined),
    ),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all([
        ...ROUTES.map((r) => precachePage(cache, r).catch(() => undefined)),
        ...ASSETS.map((a) => cache.add(a).catch(() => undefined)),
      ]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("pocketflow-") && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(new URL(request.url).pathname, res.clone());
    return res;
  } catch {
    const cached = (await cache.match(request, { ignoreSearch: true })) ?? (await cache.match("/"));
    return cached ?? new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached ?? network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  } else if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith("/_next/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(staleWhileRevalidate(request));
  }
});

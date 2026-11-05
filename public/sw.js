/* public/sw.js — Kaizen service worker
 * - Offline: pages are network-first with a cached fallback; build assets are cache-first.
 * - Reminders: shows the daily check-in notification (periodic background sync where
 *   the browser supports it, or when the open app asks).
 * API calls are never cached.
 */
const VERSION = "kaizen-v2";
const PAGES = ["/", "/journal", "/garden", "/insights", "/breathe", "/quotes", "/settings"];
const OFFLINE_URL = "/offline.html"; // static, needs no JavaScript
const META_CACHE = "kaizen-meta";
const META_URL = "/__kaizen_meta__";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) =>
      Promise.all(PAGES.concat([OFFLINE_URL, "/icon.svg", "/manifest.webmanifest"]).map((u) => cache.add(u).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== META_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Immutable build assets: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
            return res;
          })
      )
    );
    return;
  }

  // Pages: network-first, fall back to cache, then the offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match(url.pathname)) || (await caches.match(OFFLINE_URL)) || Response.error())
    );
    return;
  }

  // Everything else (icons, RSC payloads…): stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => hit || Response.error());
      return hit || network;
    })
  );
});

/* ------------------------------- Reminders ------------------------------- */

async function readMeta() {
  const res = await (await caches.open(META_CACHE)).match(META_URL);
  return res ? res.json() : {};
}
async function writeMeta(meta) {
  await (await caches.open(META_CACHE)).put(META_URL, new Response(JSON.stringify(meta), { headers: { "content-type": "application/json" } }));
}
function localDayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function maybeRemind(force) {
  const meta = await readMeta();
  if (!meta.enabled || !meta.time) return;
  const today = localDayKey();
  if (!force) {
    const [h, m] = meta.time.split(":").map(Number);
    const now = new Date();
    if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
    if (meta.lastCheckIn === today || meta.notifiedDay === today) return;
  }
  await self.registration.showNotification("How are you feeling today? 🌱", {
    body: "Take ten seconds to check in and plant today's flower.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: "kaizen-daily",
    renotify: false,
    data: { url: "/journal" },
  });
  await writeMeta({ ...meta, notifiedDay: today });
}

self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type === "kaizen:meta") event.waitUntil(readMeta().then((m) => writeMeta({ ...m, ...msg.meta })));
  if (msg.type === "kaizen:remind") event.waitUntil(maybeRemind(Boolean(msg.force)));
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "kaizen-reminder") event.waitUntil(maybeRemind(false));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/journal";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.navigate(target).catch(() => {});
          return w.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

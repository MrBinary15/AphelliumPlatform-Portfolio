/// <reference lib="webworker" />

const SW_VERSION = "1.0.0";
const CACHE_NAME = `aphellium-v${SW_VERSION}`;
const OFFLINE_URL = "/offline.html";

// Assets to cache on install (app shell)
const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
];

// ─── INSTALL ───────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ─── ACTIVATE ──────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── FETCH — Network-first with fallback to cache ─────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests and API/auth routes
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2?)$/) || url.pathname === "/")) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // For navigation requests show offline page
          if (request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
          return new Response("Offline", { status: 503 });
        })
      )
  );
});

// ─── PUSH NOTIFICATIONS ───────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Aphellium", body: event.data.text() };
  }

  const { title = "Aphellium", body = "", type, url, icon, tag, meetingSlug } = payload;

  const options = {
    body,
    icon: icon || "/assets/icons/icon-192.png",
    badge: "/assets/icons/icon-192.png",
    tag: tag || type || "general",
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: url || "/", type, meetingSlug },
    actions: [],
  };

  // Customize by notification type
  if (type === "call" || type === "meeting_invitation") {
    options.tag = `call-${meetingSlug || Date.now()}`;
    options.requireInteraction = true; // Stays visible until user acts
    options.vibrate = [300, 100, 300, 100, 300];
    options.actions = [
      { action: "accept", title: "✅ Contestar" },
      { action: "decline", title: "❌ Rechazar" },
    ];
  } else if (type === "message" || type === "chat") {
    options.tag = `msg-${tag || Date.now()}`;
    options.actions = [
      { action: "reply", title: "💬 Ver mensaje" },
    ];
  } else if (type === "support") {
    options.tag = `support-${tag || Date.now()}`;
    options.requireInteraction = true;
    options.actions = [
      { action: "open", title: "📋 Abrir soporte" },
    ];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── NOTIFICATION CLICK ───────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const { url, type, meetingSlug } = event.notification.data || {};
  let targetUrl = url || "/";

  if (event.action === "accept" && meetingSlug) {
    targetUrl = `/admin/reuniones/sala/${meetingSlug}`;
  } else if (event.action === "decline") {
    // Just close the notification
    return;
  } else if (event.action === "reply" || event.action === "open") {
    targetUrl = url || "/admin";
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if found
      for (const client of clients) {
        if (new URL(client.url).pathname === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      // Open new tab
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ─── NOTIFICATION CLOSE (for declined calls) ──────────
self.addEventListener("notificationclose", (event) => {
  // Could send a "declined" signal back to the server if needed
});

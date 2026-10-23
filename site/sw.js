const CACHE = "treino-ppl-v3";
const ASSETS = ["./", "./index.html", "./treino.html", "./manifest.json", "./native-bridge.js", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./privacy-policy.html"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(ASSETS.map((u) => c.add(u).catch(()=>{})))));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// rede primeiro (sempre pega a versão mais nova do app), cache como fallback offline
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin) || !e.request.url.startsWith(self.location.origin) || !e.request.url.startsWith(self.location.origin) || !e.request.url.startsWith(self.location.origin) || !e.request.url.startsWith(self.location.origin) || !e.request.url.startsWith(self.location.origin) || !e.request.url.startsWith(self.location.origin) || !e.request.url.startsWith(self.location.origin) || !e.request.url.startsWith(self.location.origin) || !e.request.url.startsWith(self.location.origin) || !e.request.url.startsWith(self.location.origin) || !e.request.url.startsWith(self.location.origin) || !e.request.url.startsWith(self.location.origin) || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(()=>{});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});

/* RackingHQ service worker
   Both index.html (the coordinator app) and crew.html (the hosted crew page) are a single
   self-contained file apiece -- all CSS and JS inline, project data loaded afterward from a
   pack file into IndexedDB. So the only job here is to let the shell itself open with no
   signal once it has been visited once: cache the handful of static files, serve them
   cache-first, and fall back to the network for anything else (or anything new). */

const CACHE = "rackinghq-v1";
const SHELL = [
  "./",
  "./index.html",
  "./crew.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit);
    })
  );
});

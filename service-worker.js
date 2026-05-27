const CACHE_NAME = "app-agenda-cache-v1";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./selecionarAgenda.html",
  "./indexAgenda.html",

  "./css/style.css",
  "./css/styleAgenda.css",

  "./js/script.js",
  "./js/selecionarAgenda.js",
  "./js/calendar.js",
  "./js/pwa-register.js",

  "./manifest.webmanifest",

  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedFile) => {
      if (cachedFile) {
        return cachedFile;
      }

      return fetch(event.request).catch(() => {
        return caches.match("./index.html");
      });
    })
  );
});
const CACHE_NAME =
  "app-agenda-cache-v6";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./selecionarAgenda.html",
  "./indexAgenda.html",

  "./style.css",
  "./styleAgenda.css",

  "./main.js",
  "./firebaseAuth.js",
  "./firebaseDB.js",
  "./selecionarAgenda.js",
  "./calendar.js",
  "./pwa-register.js",

  "./manifest.webmanifest",

  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener(
  "install",
  (event) => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then(async (cache) => {
          for (
            const arquivo of FILES_TO_CACHE
          ) {
            try {
              await cache.add(arquivo);
            } catch (erro) {
              console.warn(
                `Não foi possível guardar no cache: ${arquivo}`,
                erro,
              );
            }
          }
        }),
    );

    self.skipWaiting();
  },
);

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map(
              (cacheName) => {
                if (
                  cacheName !== CACHE_NAME
                ) {
                  return caches.delete(
                    cacheName,
                  );
                }

                return null;
              },
            ),
          );
        }),
    );

    self.clients.claim();
  },
);

self.addEventListener(
  "fetch",
  (event) => {
    if (
      event.request.method !== "GET"
    ) {
      return;
    }

    /*
      Não interfere nas requisições externas
      do Firebase e do Google.
    */
    const url =
      new URL(event.request.url);

    if (
      url.origin !== self.location.origin
    ) {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copia =
            response.clone();

          caches
            .open(CACHE_NAME)
            .then((cache) => {
              cache.put(
                event.request,
                copia,
              );
            });

          return response;
        })
        .catch(async () => {
          const arquivoCache =
            await caches.match(
              event.request,
            );

          if (arquivoCache) {
            return arquivoCache;
          }

          if (
            event.request.mode ===
            "navigate"
          ) {
            return caches.match(
              "./index.html",
            );
          }

          throw new Error(
            "Arquivo indisponível.",
          );
        }),
    );
  },
);
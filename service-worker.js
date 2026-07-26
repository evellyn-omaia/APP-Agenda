const CACHE_NAME = "app-agenda-cache-v8";

const FILES_TO_CACHE = [
  "./index.html",
  "./selecionarAgenda.html",
  "./indexAgenda.html",
  "./style.css?v=8",
  "./styleAgenda.css?v=8",
  "./main.js?v=8",
  "./firebaseConfig.js",
  "./firebaseAuth.js",
  "./firebaseDB.js",
  "./selecionarAgenda.js?v=8",
  "./calendar.js?v=8",
  "./pwa-register.js?v=8",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const arquivo of FILES_TO_CACHE) {
        try {
          /*
            cache: reload evita que a instalação de uma nova versão copie
            novamente arquivos antigos do cache HTTP do navegador.
          */
          await cache.add(new Request(arquivo, { cache: "reload" }));
        } catch (erro) {
          console.warn(`Não foi possível guardar no cache: ${arquivo}`, erro);
        }
      }
    }),
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.map((cacheName) => {
        if (
          cacheName.startsWith("app-agenda-cache-")
          && cacheName !== CACHE_NAME
        ) {
          return caches.delete(cacheName);
        }

        return Promise.resolve(false);
      }),
    )),
  );

  self.clients.claim();
});

async function respostaDeNavegacao(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }

    return response;
  } catch (erro) {
    /*
      Em uma aplicação com várias páginas, nunca devolvemos index.html para
      qualquer navegação. Isso fazia uma falha ao abrir selecionarAgenda.html
      parecer um logout e mostrava a tela de login indevidamente.
    */
    const paginaEmCache = await caches.match(request, {
      ignoreSearch: true,
    });

    if (paginaEmCache) {
      return paginaEmCache;
    }

    return new Response(
      `<!doctype html>
      <html lang="pt-br">
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Sem conexão</title>
        <body style="font-family:Arial,sans-serif;padding:32px">
          <h1>Sem conexão</h1>
          <p>Não foi possível abrir esta página. Verifique a internet e tente novamente.</p>
          <button onclick="location.reload()">Tentar novamente</button>
        </body>
      </html>`,
      {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }
}

async function respostaDeArquivo(request) {
  const cache = await caches.open(CACHE_NAME);
  const armazenado = await cache.match(request, { ignoreSearch: false });

  const atualizacao = fetch(request)
    .then((response) => {
      if (response.ok && response.type === "basic") {
        cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => null);

  return armazenado || await atualizacao || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Não intercepta Firebase, Google Fonts, Google Login ou outros domínios.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(respostaDeNavegacao(request));
    return;
  }

  event.respondWith(respostaDeArquivo(request));
});

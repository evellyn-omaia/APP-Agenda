if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      /*
        Limpeza única das versões antigas que podiam devolver index.html
        quando outra página falhava ao carregar.
      */
      const chaveMigracao = "agenda-cache-migrado-v8";

      if (localStorage.getItem(chaveMigracao) !== "1" && "caches" in window) {
        const nomes = await caches.keys();

        await Promise.all(
          nomes
            .filter((nome) => nome.startsWith("app-agenda-cache-"))
            .map((nome) => caches.delete(nome)),
        );

        localStorage.setItem(chaveMigracao, "1");
      }

      const registro = await navigator.serviceWorker.register(
        "./service-worker.js",
      );

      // Procura uma atualização toda vez que o aplicativo é aberto.
      await registro.update();

      console.log("Service Worker registrado com sucesso.");
    } catch (error) {
      console.error("Erro ao registrar Service Worker:", error);
    }
  });
}

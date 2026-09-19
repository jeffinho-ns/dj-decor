/**
 * Service worker do PWA DJ festas.
 *
 * Responsabilidades:
 *  - receber notificações push e exibir no celular (inclusive iOS 16.4+);
 *  - abrir a tela certa quando a pessoa toca na notificação;
 *  - guardar o shell estático para abrir rápido e não morrer sem sinal.
 *
 * Não intercepta chamadas de API: a fila offline em localStorage já cuida
 * do reenvio das ações dos montadores.
 */

const VERSAO = "v2";
const CACHE_ESTATICO = `dj-festas-estatico-${VERSAO}`;
const CACHE_PAGINAS = `dj-festas-paginas-${VERSAO}`;
const ROTA_OFFLINE = "/offline";

// A logo entra aqui para a abertura funcionar mesmo sem sinal.
const PRECACHE = [
  ROTA_OFFLINE,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/logo-baloes.png",
  "/icons/logo-nome.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_ESTATICO)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          chaves
            .filter((chave) => !chave.endsWith(VERSAO))
            .map((chave) => caches.delete(chave))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Assets versionados do Next e ícones podem vir do cache direto. */
function ehAssetEstatico(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".woff2")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (ehAssetEstatico(url)) {
    event.respondWith(
      caches.match(request).then((cacheado) => {
        if (cacheado) return cacheado;
        return fetch(request).then((resposta) => {
          if (resposta.ok) {
            const copia = resposta.clone();
            caches.open(CACHE_ESTATICO).then((cache) => cache.put(request, copia));
          }
          return resposta;
        });
      })
    );
    return;
  }

  // Navegação: rede primeiro (dados sempre frescos), cache como rede de segurança.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((resposta) => {
          if (resposta.ok) {
            const copia = resposta.clone();
            caches
              .open(CACHE_PAGINAS)
              .then((cache) => cache.put(request, copia));
          }
          return resposta;
        })
        .catch(async () => {
          const cacheado = await caches.match(request);
          if (cacheado) return cacheado;
          const offline = await caches.match(ROTA_OFFLINE);
          if (offline) return offline;
          return new Response("Sem conexão", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        })
    );
  }
});

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { titulo: "DJ festas", corpo: event.data ? event.data.text() : "" };
  }

  const titulo = dados.titulo || "DJ festas";
  const opcoes = {
    body: dados.corpo || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: dados.tag || "dj-festas",
    renotify: Boolean(dados.tag),
    requireInteraction: Boolean(dados.urgente),
    vibrate: dados.urgente ? [180, 80, 180] : [120],
    data: { url: dados.url || "/dashboard", ...(dados.dados || {}) },
  };

  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const destino = (event.notification.data && event.notification.data.url) || "/dashboard";
  const urlCompleta = new URL(destino, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((janelas) => {
        // Se o app já está aberto, navega nele em vez de abrir outra instância.
        for (const janela of janelas) {
          if ("focus" in janela) {
            janela.focus();
            if ("navigate" in janela) return janela.navigate(urlCompleta);
            return undefined;
          }
        }
        return self.clients.openWindow(urlCompleta);
      })
  );
});

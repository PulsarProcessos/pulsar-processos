// Notificações do Pulsar: incluído no service worker gerado pelo vite-plugin-pwa
// (workbox.importScripts no vite.config.ts). Os avisos vêm da Edge Function "notificacoes".

self.addEventListener("push", (event) => {
  let aviso = {};
  try {
    aviso = event.data ? event.data.json() : {};
  } catch (e) {
    aviso = { corpo: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(aviso.titulo || "Pulsar", {
      body: aviso.corpo || "",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: aviso.tag,
      data: { url: aviso.url || "/" },
    }),
  );
});

// Tocar no aviso abre o Pulsar na tela certa (reaproveita a janela se já estiver aberta).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ("focus" in janela) {
          janela.navigate(url);
          return janela.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

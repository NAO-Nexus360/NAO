// Service worker de NAO: notificaciones push y uso sin conexión.
//
// Sin conexión: guarda las pantallas que se visitan (y los archivos que necesitan) para poder
// abrirlas sin internet. Con conexión siempre pide primero la versión más reciente.
const VERSION = "v1";
const CACHE_PAGINAS = `nao-paginas-${VERSION}`;
const CACHE_ESTATICOS = `nao-estaticos-${VERSION}`;
const ESPERA_RED_MS = 7000;

let simularSinConexion = false; // solo para pruebas internas

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(
        nombres.filter((n) => n.startsWith("nao-") && n !== CACHE_PAGINAS && n !== CACHE_ESTATICOS).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  const dato = event.data || {};
  if (dato.tipo === "limpiar-cache") {
    event.waitUntil(
      caches.keys().then((nombres) => Promise.all(nombres.filter((n) => n.startsWith("nao-")).map((n) => caches.delete(n))))
    );
  }
  if (dato.tipo === "simular-sin-conexion") simularSinConexion = !!dato.valor;
});

function redConFallo() {
  return Promise.reject(new TypeError("Sin conexión (simulada)"));
}

function pedirRed(request) {
  return simularSinConexion ? redConFallo() : fetch(request);
}

function conLimite(promesa, ms) {
  return Promise.race([promesa, new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("tiempo agotado")), ms))]);
}

const esEstatico = (url) =>
  url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest";

const respuestaSinConexion = () =>
  new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>NAO</title>
<style>body{font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
.c{max-width:340px}button{margin-top:16px;padding:10px 18px;border:0;border-radius:8px;background:#0f172a;color:#fff;font-size:15px}</style></head>
<body><div class="c"><h1>Sin conexión</h1><p>Esta pantalla todavía no se guardó en tu teléfono. Conéctate a internet y ábrela una vez para poder verla sin señal.</p>
<button onclick="location.reload()">Reintentar</button></div></body></html>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // los datos siempre van a internet
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return; // navegación interna de Next: si falla, Next recarga la página completa

  // Archivos que no cambian: primero lo guardado
  if (esEstatico(url)) {
    event.respondWith(
      caches.open(CACHE_ESTATICOS).then(async (cache) => {
        const guardado = await cache.match(request);
        if (guardado) return guardado;
        const respuesta = await pedirRed(request);
        if (respuesta.ok) cache.put(request, respuesta.clone());
        return respuesta;
      })
    );
    return;
  }

  // Pantallas: primero internet (rápido), y si no hay, lo último guardado
  const esPantalla = request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");
  if (esPantalla) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_PAGINAS);
        try {
          const respuesta = await conLimite(pedirRed(request), ESPERA_RED_MS);
          // No se guardan redirecciones (por ejemplo, al inicio de sesión) ni errores
          if (respuesta.ok && !respuesta.redirected) cache.put(request.url, respuesta.clone());
          return respuesta;
        } catch (e) {
          const guardada = await cache.match(request.url);
          return guardada || respuestaSinConexion();
        }
      })()
    );
  }
});

// ---------- Notificaciones push ----------
self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch (e) {
    datos = { titulo: "NAO", cuerpo: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(datos.titulo || "NAO", {
      body: datos.cuerpo || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: datos.url || "/obras" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/obras";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if ("focus" in v) {
          if ("navigate" in v) v.navigate(url);
          return v.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

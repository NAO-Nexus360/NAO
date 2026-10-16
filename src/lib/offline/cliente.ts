// Parte del navegador del modo sin conexión: envío de cambios, descarga de pantallas y limpieza.
import { almacenIndexedDB, encolarCambio, sincronizarOutbox, RespuestaRed, ResultadoSincronizacion, OperacionOffline } from "@/lib/offline/outbox";

export const EVENTO_SINCRONIZADO = "nao-sincronizado";
const CLAVE_PRECARGA = "nao-offline-precarga";
const CLAVE_USUARIO = "nao-offline-usuario";
const SEIS_HORAS = 6 * 60 * 60 * 1000;

export async function llamarRed(metodo: "GET" | "POST" | "PATCH", url: string, cuerpo?: any): Promise<RespuestaRed> {
  const res = await fetch(url, {
    method: metodo,
    headers: cuerpo !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* sin cuerpo */ }
  return { ok: res.ok, status: res.status, json };
}

// Intenta enviar el cambio. Si no hay conexión, lo guarda en la cola para enviarlo después.
export async function enviarOEncolar(opts: {
  metodo: "POST" | "PATCH";
  url: string;
  cuerpo: Record<string, any>;
  cambio: { tipo: "crear" | "editar"; obraId: string; pendienteId: string; baseActualizadoEn?: string | null; titulo: string };
}): Promise<{ enviado: true; respuesta: Response } | { enviado: false; operacion: OperacionOffline }> {
  const sinRed = typeof navigator !== "undefined" && navigator.onLine === false;
  if (!sinRed) {
    try {
      const respuesta = await fetch(opts.url, {
        method: opts.metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(opts.cuerpo),
      });
      return { enviado: true, respuesta };
    } catch {
      /* sin conexión: se guarda abajo */
    }
  }
  const operacion = await encolarCambio(almacenIndexedDB, { ...opts.cambio, cuerpo: opts.cuerpo });
  return { enviado: false, operacion };
}

let sincronizando = false;
export async function sincronizarAhora(): Promise<ResultadoSincronizacion | null> {
  if (sincronizando) return null;
  sincronizando = true;
  try {
    const r = await sincronizarOutbox(almacenIndexedDB, llamarRed);
    window.dispatchEvent(new CustomEvent(EVENTO_SINCRONIZADO, { detail: r }));
    return r;
  } finally {
    sincronizando = false;
  }
}

export const contarCambiosPendientes = async () => (await almacenIndexedDB.todos()).length;
export const leerCambiosPendientes = () => almacenIndexedDB.todos();

async function trabajadorActivo() {
  const reg = await navigator.serviceWorker?.getRegistration("/sw.js");
  return reg?.active ?? null;
}

// Borra lo guardado en el teléfono (cambios sin enviar y pantallas guardadas)
export async function limpiarDatosLocales() {
  try { await almacenIndexedDB.vaciar(); } catch { /* ignorar */ }
  try { (await trabajadorActivo())?.postMessage({ tipo: "limpiar-cache" }); } catch { /* ignorar */ }
  try { localStorage.removeItem(CLAVE_PRECARGA); } catch { /* ignorar */ }
}

// Si entra otra persona en el mismo teléfono, se borra lo de la anterior
export async function verificarUsuarioLocal(usuarioId: string) {
  try {
    const anterior = localStorage.getItem(CLAVE_USUARIO);
    if (anterior && anterior !== usuarioId) await limpiarDatosLocales();
    localStorage.setItem(CLAVE_USUARIO, usuarioId);
  } catch { /* sin almacenamiento */ }
}

// Solo para pruebas internas
export async function simularSinConexion(valor: boolean) {
  (await trabajadorActivo())?.postMessage({ tipo: "simular-sin-conexion", valor });
}

export const ultimaPrecarga = (): number | null => {
  try { const v = Number(localStorage.getItem(CLAVE_PRECARGA)); return v || null; } catch { return null; }
};

// Descarga las pantallas de tus obras (y los archivos que usan) para abrirlas sin señal
export async function precargarPantallas(forzar = false): Promise<{ pantallas: number; fallidas: number } | null> {
  if (typeof navigator === "undefined" || !navigator.onLine || !("serviceWorker" in navigator)) return null;
  const ultima = ultimaPrecarga();
  if (!forzar && ultima && Date.now() - ultima < SEIS_HORAS) return null;

  const lista = await fetch("/api/offline/pantallas");
  if (!lista.ok) return null;
  const { urls } = (await lista.json()) as { urls: string[] };

  const archivos = new Set<string>();
  let pantallas = 0;
  let fallidas = 0;
  const pendientes = [...urls];

  async function trabajador() {
    while (pendientes.length) {
      const url = pendientes.shift()!;
      try {
        const r = await fetch(url, { headers: { Accept: "text/html" } });
        if (!r.ok || r.redirected) { fallidas++; continue; }
        pantallas++;
        const html = await r.text();
        for (const m of html.matchAll(/\/_next\/static\/[^"'\s\\<>]+?\.(?:js|css)(?=["'\s\\<>?]|$)/g)) archivos.add(m[0]);
      } catch { fallidas++; }
    }
  }
  await Promise.all([trabajador(), trabajador(), trabajador()]);

  const porBajar = [...archivos];
  async function bajador() {
    while (porBajar.length) {
      const a = porBajar.shift()!;
      try { await fetch(a); } catch { /* se intentará la próxima vez */ }
    }
  }
  await Promise.all([bajador(), bajador(), bajador(), bajador()]);

  try { localStorage.setItem(CLAVE_PRECARGA, String(Date.now())); } catch { /* ignorar */ }
  return { pantallas, fallidas };
}

// Cola de cambios hechos sin conexión (pendientes y minutas). Se envían al servidor al reconectarse.
// La lógica no depende del navegador: el almacenamiento se inyecta, para poder probarla.

export type Entidad = "pendiente" | "minuta";
const RUTA: Record<Entidad, string> = { pendiente: "/api/pendientes", minuta: "/api/minutas" };

export type OperacionOffline = {
  id: string;
  entidad?: Entidad; // las operaciones guardadas antes de las minutas no lo traen: son pendientes
  tipo: "crear" | "editar";
  obraId: string;
  pendienteId: string; // id real del pendiente/minuta, o "local-..." si todavía no existe en el servidor
  cuerpo: Record<string, any>;
  baseActualizadoEn: string | null; // updatedAt que tenía el pendiente cuando se editó sin conexión
  titulo: string;
  creadoEn: number;
};

export interface AlmacenOutbox {
  todos(): Promise<OperacionOffline[]>;
  guardar(op: OperacionOffline): Promise<void>;
  borrar(id: string): Promise<void>;
  vaciar(): Promise<void>;
}

export const esIdLocal = (id: string) => id.startsWith("local-");
export const nuevoIdLocal = () => `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Si ya hay un cambio pendiente del mismo pendiente, se combinan (gana lo más reciente)
export async function encolarCambio(
  almacen: AlmacenOutbox,
  cambio: { entidad?: Entidad; tipo: "crear" | "editar"; obraId: string; pendienteId: string; cuerpo: Record<string, any>; baseActualizadoEn?: string | null; titulo: string }
): Promise<OperacionOffline> {
  const existentes = await almacen.todos();
  const previa = existentes.find((o) => o.pendienteId === cambio.pendienteId && (o.entidad ?? "pendiente") === (cambio.entidad ?? "pendiente"));
  if (previa) {
    const combinada: OperacionOffline = {
      ...previa,
      cuerpo: { ...previa.cuerpo, ...cambio.cuerpo },
      titulo: cambio.titulo || previa.titulo,
    };
    await almacen.guardar(combinada);
    return combinada;
  }
  const op: OperacionOffline = {
    id: `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    entidad: cambio.entidad ?? "pendiente",
    tipo: cambio.tipo,
    obraId: cambio.obraId,
    pendienteId: cambio.pendienteId,
    cuerpo: cambio.cuerpo,
    baseActualizadoEn: cambio.tipo === "editar" ? cambio.baseActualizadoEn ?? null : null,
    titulo: cambio.titulo,
    creadoEn: Date.now(),
  };
  await almacen.guardar(op);
  return op;
}

// Muestra en pantalla lo que está pendiente de enviar, encima de los datos guardados.
// `construirLocal` convierte (pendiente existente | null, cuerpo) en el objeto que usa la pantalla.
export function aplicarOperaciones<T extends { id: string }>(
  pendientes: T[],
  ops: OperacionOffline[],
  obraId: string,
  construirLocal: (base: T | null, cuerpo: Record<string, any>, op: OperacionOffline) => T,
  entidad: Entidad = "pendiente"
): T[] {
  let lista = [...pendientes];
  for (const op of [...ops].filter((o) => o.obraId === obraId && (o.entidad ?? "pendiente") === entidad).sort((a, b) => a.creadoEn - b.creadoEn)) {
    const i = lista.findIndex((p) => p.id === op.pendienteId);
    if (op.tipo === "crear") {
      const local = construirLocal(null, op.cuerpo, op);
      if (i >= 0) lista[i] = local;
      else lista = [local, ...lista];
    } else if (i >= 0) {
      lista[i] = construirLocal(lista[i], op.cuerpo, op);
    }
  }
  return lista;
}

// ---------- Envío al reconectarse ----------

export type RespuestaRed = { ok: boolean; status: number; json: any };
// Debe lanzar un error si no hay conexión
export type LlamadaRed = (metodo: "GET" | "POST" | "PATCH", url: string, cuerpo?: any) => Promise<RespuestaRed>;

export type ResultadoSincronizacion = {
  enviados: number;
  conflictos: string[]; // el pendiente ya había cambiado en el servidor; se aplicó igualmente el cambio
  errores: string[]; // cambios que el servidor rechazó y se descartaron
  quedan: number;
  sinRed: boolean;
};

const mensajeError = (r: RespuestaRed) =>
  typeof r.json?.error === "string" ? r.json.error : `Error ${r.status}`;

export async function sincronizarOutbox(almacen: AlmacenOutbox, red: LlamadaRed): Promise<ResultadoSincronizacion> {
  const resultado: ResultadoSincronizacion = { enviados: 0, conflictos: [], errores: [], quedan: 0, sinRed: false };
  const ops = (await almacen.todos()).sort((a, b) => a.creadoEn - b.creadoEn);
  const idsReales = new Map<string, string>(); // id local -> id real

  for (const op of ops) {
    const ruta = RUTA[op.entidad ?? "pendiente"];
    try {
      if (op.tipo === "crear") {
        const r = await red("POST", ruta, { ...op.cuerpo, obraId: op.obraId });
        if (r.ok) {
          idsReales.set(op.pendienteId, r.json?.id);
          await almacen.borrar(op.id);
          resultado.enviados++;
        } else if (r.status >= 400 && r.status < 500) {
          await almacen.borrar(op.id);
          resultado.errores.push(`No se pudo crear "${op.titulo}": ${mensajeError(r)}`);
        } else {
          break; // error del servidor: se reintenta después
        }
      } else {
        const idReal = idsReales.get(op.pendienteId) ?? op.pendienteId;
        if (esIdLocal(idReal)) {
          await almacen.borrar(op.id); // su creación se descartó: no hay a qué aplicarle el cambio
          continue;
        }
        const actual = await red("GET", `${ruta}/${idReal}`);
        if (actual.status === 404) {
          await almacen.borrar(op.id);
          resultado.errores.push(`"${op.titulo}" ya no existe; se descartó tu cambio.`);
          continue;
        }
        if (!actual.ok) {
          if (actual.status >= 400 && actual.status < 500) {
            await almacen.borrar(op.id);
            resultado.errores.push(`No se pudo actualizar "${op.titulo}": ${mensajeError(actual)}`);
            continue;
          }
          break;
        }
        const cambioAjeno =
          !!op.baseActualizadoEn && !!actual.json?.updatedAt && new Date(actual.json.updatedAt) > new Date(op.baseActualizadoEn);
        const r = await red("PATCH", `${ruta}/${idReal}`, op.cuerpo);
        if (r.ok) {
          await almacen.borrar(op.id);
          resultado.enviados++;
          if (cambioAjeno) resultado.conflictos.push(op.titulo);
        } else if (r.status >= 400 && r.status < 500) {
          await almacen.borrar(op.id);
          resultado.errores.push(`No se pudo actualizar "${op.titulo}": ${mensajeError(r)}`);
        } else {
          break;
        }
      }
    } catch {
      resultado.sinRed = true; // sin conexión: se conserva lo que falta
      break;
    }
  }
  resultado.quedan = (await almacen.todos()).length;
  return resultado;
}

// ---------- Almacenamiento real (IndexedDB) ----------

const NOMBRE_BD = "nao-offline";
const TIENDA = "outbox";

function abrirBD(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const req = indexedDB.open(NOMBRE_BD, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(TIENDA)) req.result.createObjectStore(TIENDA, { keyPath: "id" });
    };
    req.onsuccess = () => resolver(req.result);
    req.onerror = () => rechazar(req.error);
  });
}

function transaccion<T>(modo: IDBTransactionMode, accion: (t: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return abrirBD().then(
    (bd) =>
      new Promise<T>((resolver, rechazar) => {
        const t = bd.transaction(TIENDA, modo);
        const req = accion(t.objectStore(TIENDA));
        t.oncomplete = () => { bd.close(); resolver(req.result); };
        t.onerror = () => { bd.close(); rechazar(t.error); };
        t.onabort = () => { bd.close(); rechazar(t.error); };
      })
  );
}

export const almacenIndexedDB: AlmacenOutbox = {
  todos: () => transaccion("readonly", (s) => s.getAll() as IDBRequest<OperacionOffline[]>),
  guardar: async (op) => { await transaccion("readwrite", (s) => s.put(op)); avisarCambio(); },
  borrar: async (id) => { await transaccion("readwrite", (s) => s.delete(id)); avisarCambio(); },
  vaciar: async () => { await transaccion("readwrite", (s) => s.clear()); avisarCambio(); },
};

export const EVENTO_OUTBOX = "nao-outbox";
function avisarCambio() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_OUTBOX));
}

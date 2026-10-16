// Cálculo (sin base de datos) de qué recordatorios corresponde enviar hoy.
export type PendienteRecordable = {
  id: string;
  tarea: string;
  obraId: string;
  obraNombre: string;
  fechaEntrega: string; // AAAA-MM-DD
  usuarioIds: string[]; // personas relacionadas con el pendiente
};

export type RecordatorioCalculado = {
  usuarioId: string;
  dias: number;
  pendientes: PendienteRecordable[];
};

const DIA_MS = 24 * 60 * 60 * 1000;

// Días entre dos fechas AAAA-MM-DD (positivo si la entrega es futura)
export function diasHasta(fechaEntrega: string, hoy: string): number {
  const [y1, m1, d1] = fechaEntrega.split("-").map(Number);
  const [y2, m2, d2] = hoy.split("-").map(Number);
  return Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y2, m2 - 1, d2)) / DIA_MS);
}

export type PreferenciaPersona = { dias: number[]; hora: number };

// Agrupa por persona y por días de anticipación. `yaEnviados` contiene claves "usuario|pendiente|dias|fecha".
// El aviso se envía cuando la hora actual ya alcanzó la hora elegida (así un retraso no lo hace perderse).
export function calcularRecordatorios(
  pendientes: PendienteRecordable[],
  preferencias: Map<string, PreferenciaPersona>,
  hoy: string,
  horaActual: number,
  yaEnviados: Set<string> = new Set()
): RecordatorioCalculado[] {
  const grupos = new Map<string, RecordatorioCalculado>();
  for (const p of pendientes) {
    const faltan = diasHasta(p.fechaEntrega, hoy);
    if (faltan < 0) continue;
    for (const usuarioId of new Set(p.usuarioIds)) {
      const pref = preferencias.get(usuarioId);
      if (!pref || !pref.dias.includes(faltan) || horaActual < pref.hora) continue;
      if (yaEnviados.has(claveRecordatorio(usuarioId, p.id, faltan, p.fechaEntrega))) continue;
      const k = `${usuarioId}|${faltan}`;
      const g = grupos.get(k) ?? { usuarioId, dias: faltan, pendientes: [] };
      g.pendientes.push(p);
      grupos.set(k, g);
    }
  }
  return Array.from(grupos.values());
}

export const claveRecordatorio = (usuarioId: string, pendienteId: string, dias: number, fecha: string) =>
  `${usuarioId}|${pendienteId}|${dias}|${fecha}`;

export function tituloRecordatorio(dias: number): string {
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  return `Vence en ${dias} días`;
}

// Texto del aviso: hasta tres tareas y "y N más"
export function cuerpoRecordatorio(pendientes: PendienteRecordable[]): string {
  const nombres = pendientes.slice(0, 3).map((p) => p.tarea);
  const resto = pendientes.length - nombres.length;
  return nombres.join(" · ") + (resto > 0 ? ` y ${resto} más` : "");
}

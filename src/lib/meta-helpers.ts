// Calcula el estado visual de una meta basado en sus fechas
// Reglas:
// - CUMPLIDA: tiene fechaReal
//   - A_TIEMPO si fechaReal <= fechaFinPlaneada
//   - TARDE si fechaReal > fechaFinPlaneada
// - VENCIDA: no tiene fechaReal y hoy > fechaFinPlaneada
// - EN_CURSO: hoy está entre fechaInicioPlaneada y fechaFinPlaneada
// - PROXIMA: hoy < fechaInicioPlaneada

export type EstadoMeta =
  | "CUMPLIDA_A_TIEMPO"
  | "CUMPLIDA_TARDE"
  | "VENCIDA"
  | "EN_CURSO"
  | "PROXIMA";

export function calcularEstadoMeta(meta: {
  fechaInicioPlaneada: Date | string;
  fechaFinPlaneada: Date | string;
  fechaReal: Date | string | null;
}): EstadoMeta {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const inicio = new Date(meta.fechaInicioPlaneada);
  const fin = new Date(meta.fechaFinPlaneada);

  if (meta.fechaReal) {
    const real = new Date(meta.fechaReal);
    return real <= fin ? "CUMPLIDA_A_TIEMPO" : "CUMPLIDA_TARDE";
  }
  if (hoy > fin) return "VENCIDA";
  if (hoy >= inicio) return "EN_CURSO";
  return "PROXIMA";
}

export const ESTADO_META_LABEL: Record<EstadoMeta, string> = {
  CUMPLIDA_A_TIEMPO: "A tiempo",
  CUMPLIDA_TARDE: "Cumplida tarde",
  VENCIDA: "Vencida",
  EN_CURSO: "En curso",
  PROXIMA: "Próxima",
};

export const ESTADO_META_CLASS: Record<EstadoMeta, string> = {
  CUMPLIDA_A_TIEMPO: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CUMPLIDA_TARDE: "bg-amber-100 text-amber-700 border-amber-200",
  VENCIDA: "bg-red-100 text-red-700 border-red-200",
  EN_CURSO: "bg-blue-100 text-blue-700 border-blue-200",
  PROXIMA: "bg-slate-100 text-slate-600 border-slate-200",
};

export const ESTADO_META_DOT: Record<EstadoMeta, string> = {
  CUMPLIDA_A_TIEMPO: "bg-emerald-500",
  CUMPLIDA_TARDE: "bg-amber-500",
  VENCIDA: "bg-red-500",
  EN_CURSO: "bg-blue-500",
  PROXIMA: "bg-slate-400",
};

// Días de diferencia entre planeado y real (negativo: adelantado, positivo: atrasado)
export function diasDiferencia(planeado: Date | string, real: Date | string | null): number | null {
  if (!real) return null;
  const p = new Date(planeado).setHours(0, 0, 0, 0);
  const r = new Date(real).setHours(0, 0, 0, 0);
  return Math.round((r - p) / (1000 * 60 * 60 * 24));
}

// Fechas en México: zona horaria America/Mexico_City y días hábiles
// (sin sábados, domingos ni días de descanso obligatorio según la Ley Federal del Trabajo, art. 74).
// Las fechas se manejan como "YYYY-MM-DD" para no depender de la zona horaria del navegador.

export const ZONA_MX = "America/Mexico_City";
const DIA_MS = 24 * 60 * 60 * 1000;

// Fecha de hoy en México como "YYYY-MM-DD"
export function hoyMX(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_MX, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

// Convierte una fecha guardada (Date o string) a "YYYY-MM-DD" según México
export function isoMX(fecha: Date | string | null | undefined): string {
  if (!fecha) return "";
  if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}/.test(fecha)) return fecha.slice(0, 10);
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_MX, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// Fecha "YYYY-MM-DD" → Date guardado a mediodía UTC (en México sigue siendo el mismo día)
export function isoAFecha(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

// Formato legible en español de México, p. ej. "lun 13 oct 2026"
export function formatFechaMX(fecha: Date | string | null | undefined): string {
  if (!fecha) return "—";
  const d = isoAFecha(isoMX(fecha));
  return new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function aUTC(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function isoDesdeUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// n-ésimo lunes de un mes (monthIdx 0-11)
function nEsimoLunes(year: number, monthIdx: number, n: number): string {
  const primero = new Date(Date.UTC(year, monthIdx, 1));
  const offset = (1 - primero.getUTCDay() + 7) % 7;
  const dia = 1 + offset + 7 * (n - 1);
  return isoDesdeUTC(Date.UTC(year, monthIdx, dia));
}

// Días de descanso obligatorio en México (LFT art. 74)
export function feriadosMX(year: number): Set<string> {
  const fechas = new Set<string>([
    `${year}-01-01`,
    nEsimoLunes(year, 1, 1), // Constitución: primer lunes de febrero
    nEsimoLunes(year, 2, 3), // Natalicio de Benito Juárez: tercer lunes de marzo
    `${year}-05-01`,
    `${year}-09-16`,
    nEsimoLunes(year, 10, 3), // Revolución: tercer lunes de noviembre
    `${year}-12-25`,
  ]);
  // 1 de diciembre de cada seis años (transmisión del Poder Ejecutivo Federal): 2024, 2030, ...
  if ((year - 2024) % 6 === 0) fechas.add(`${year}-12-01`);
  return fechas;
}

export function esDiaHabilMX(iso: string): boolean {
  const dow = new Date(aUTC(iso)).getUTCDay();
  if (dow === 0 || dow === 6) return false;
  const year = Number(iso.slice(0, 4));
  return !feriadosMX(year).has(iso);
}

// Suma (o resta si n es negativo) días hábiles a una fecha
export function sumarDiasHabilesMX(iso: string, n: number): string {
  let t = aUTC(iso);
  const paso = n >= 0 ? DIA_MS : -DIA_MS;
  let contados = 0;
  while (contados < Math.abs(n)) {
    t += paso;
    if (esDiaHabilMX(isoDesdeUTC(t))) contados++;
  }
  return isoDesdeUTC(t);
}

// Días hábiles entre dos fechas: sumarDiasHabilesMX(desde, diferenciaDiasHabilesMX(desde, hasta)) === hasta (en días hábiles)
export function diferenciaDiasHabilesMX(desde: string, hasta: string): number {
  const a = aUTC(desde);
  const b = aUTC(hasta);
  let n = 0;
  if (b > a) {
    for (let t = a + DIA_MS; t <= b; t += DIA_MS) if (esDiaHabilMX(isoDesdeUTC(t))) n++;
    return n;
  }
  if (b < a) {
    for (let t = b; t < a; t += DIA_MS) if (esDiaHabilMX(isoDesdeUTC(t))) n++;
    return -n;
  }
  return 0;
}

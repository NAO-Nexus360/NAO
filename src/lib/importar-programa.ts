// Lee un archivo (Excel, CSV o PDF con texto) y saca pares fecha + actividad.
// Solo agrega filas que tengan una fecha con año y una descripción; lo demás se omite.
import * as XLSX from "xlsx";

export type FilaImportada = { fecha: string; actividad: string };
export type ResultadoLectura = { filas: FilaImportada[]; ignoradas: number };

const MESES: Record<string, number> = {
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4,
  may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8,
  sep: 9, sept: 9, septiembre: 9, set: 9, oct: 10, octubre: 10,
  nov: 11, noviembre: 11, dic: 12, diciembre: 12,
};

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function fechaValida(y: number, m: number, d: number): string | null {
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Busca una fecha con año dentro de un texto. Devuelve la fecha y el texto restante.
export function extraerFecha(texto: string): { fecha: string; resto: string } | null {
  const reglas: { re: RegExp; leer: (m: RegExpMatchArray) => string | null }[] = [
    { re: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, leer: (m) => fechaValida(+m[1], +m[2], +m[3]) },
    { re: /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/, leer: (m) => fechaValida(+m[3], +m[2], +m[1]) },
    {
      re: /\b(\d{1,2})[\s\-]+(?:de\s+)?([a-zA-Z]+)\.?[\s\-]+(?:de\s+)?(\d{4})\b/,
      leer: (m) => {
        const mes = MESES[sinAcentos(m[2])];
        return mes ? fechaValida(+m[3], mes, +m[1]) : null;
      },
    },
  ];
  for (const { re, leer } of reglas) {
    const m = texto.match(re);
    if (!m) continue;
    const fecha = leer(m);
    if (!fecha) continue;
    const resto = texto
      .replace(m[0], " ")
      .replace(/\s+/g, " ")
      .replace(/^[\s\-–—:|·.,;]+|[\s\-–—:|·.,;]+$/g, "")
      .trim();
    return { fecha, resto };
  }
  return null;
}

const tieneLetras = (s: string) => /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/.test(s);

// Una fila de celdas: la primera fecha válida es la fecha; el resto de texto es la actividad
function filaAActividad(fila: any[]): { fecha: string | null; actividad: string } {
  let fecha: string | null = null;
  const textos: string[] = [];
  for (const celda of fila) {
    if (!fecha && celda instanceof Date && !isNaN(celda.getTime())) {
      // Excel guarda fechas de día completo en UTC; se leen con sus partes UTC
      fecha = fechaValida(celda.getUTCFullYear(), celda.getUTCMonth() + 1, celda.getUTCDate());
    } else if (typeof celda === "string") {
      const texto = celda.trim();
      if (!texto) continue;
      const ex: { fecha: string; resto: string } | null = fecha ? null : extraerFecha(texto);
      if (ex) {
        fecha = ex.fecha;
        if (ex.resto) textos.push(ex.resto);
      } else {
        textos.push(texto);
      }
    }
  }
  return { fecha, actividad: textos.filter(tieneLetras).join(" ").trim() };
}

function filasAResultado(filasCrudas: any[][]): ResultadoLectura {
  const filas: FilaImportada[] = [];
  let ignoradas = 0;
  for (const fila of filasCrudas) {
    const { fecha, actividad } = filaAActividad(fila);
    if (!fecha) continue; // encabezados, totales y filas sin fecha no cuentan como omitidas
    if (actividad.length < 2) {
      ignoradas++;
      continue;
    }
    filas.push({ fecha, actividad });
  }
  return { filas, ignoradas };
}

// Excel (.xlsx, .xls): todas las hojas
export function leerExcel(buffer: Buffer): ResultadoLectura {
  const libro = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const filas: any[][] = [];
  for (const nombre of libro.SheetNames) {
    const matriz = XLSX.utils.sheet_to_json<any[]>(libro.Sheets[nombre], {
      header: 1, raw: true, blankrows: false, defval: "",
    });
    filas.push(...matriz);
  }
  return filasAResultado(filas);
}

// CSV: se lee como texto para que las fechas dd/mm/yyyy no se malinterpreten como mm/dd
export function leerCSV(buffer: Buffer): ResultadoLectura {
  const filas = buffer
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => l.split(/[,;]/));
  return filasAResultado(filas);
}

// Texto plano (PDF ya extraído): cada línea con fecha y descripción es una actividad
export function leerTexto(texto: string): ResultadoLectura {
  const filas: FilaImportada[] = [];
  let ignoradas = 0;
  for (const linea of texto.split(/\r?\n/)) {
    const l = linea.trim();
    if (!l) continue;
    const ex = extraerFecha(l);
    if (!ex) continue;
    if (ex.resto.length < 2 || !tieneLetras(ex.resto)) {
      ignoradas++;
      continue;
    }
    filas.push({ fecha: ex.fecha, actividad: ex.resto });
  }
  return { filas, ignoradas };
}

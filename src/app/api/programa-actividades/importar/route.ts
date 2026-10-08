import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions, soloLectura } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";
import { puedeImportar } from "@/lib/permisos-importar";
import { cargarPlan, insertarFilas } from "@/lib/programa-actividades";
import { isoAFecha } from "@/lib/fechas-mx";
import { leerExcel, leerCSV, leerTexto, ResultadoLectura } from "@/lib/importar-programa";

export const runtime = "nodejs";

// pdf-parse se carga desde su archivo interno para evitar que lea un PDF de prueba al iniciar
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

const FORMATOS_IMAGEN = /\.(png|jpe?g|webp|gif|heic|heif|bmp|tiff?)$/i;

// Sube un archivo del programa y agrega sus actividades (fecha + descripción) al final del plan.
// Solo disponible para la cuenta autorizada.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeImportar(session.user.email)) {
    return NextResponse.json({ error: "No tienes acceso a esta función" }, { status: 403 });
  }
  if (soloLectura(session.user.role)) {
    return NextResponse.json({ error: "Tu rol no permite importar" }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const obraId = String(form.get("obraId") || "");
    const contratistaId = String(form.get("contratistaId") || "");
    const archivo = form.get("file");
    if (!obraId || !contratistaId || !(archivo instanceof File)) {
      return NextResponse.json({ error: "Faltan la obra, el contratista o el archivo" }, { status: 400 });
    }

    const ok = await userHasObraAccess(session.user.id, obraId);
    if (!ok) return NextResponse.json({ error: "Sin acceso a esta obra" }, { status: 403 });

    const nombre = archivo.name.toLowerCase();
    const buffer = Buffer.from(await archivo.arrayBuffer());

    let lectura: ResultadoLectura;
    if (/\.(xlsx|xls)$/.test(nombre)) {
      lectura = leerExcel(buffer);
    } else if (nombre.endsWith(".csv")) {
      lectura = leerCSV(buffer);
    } else if (nombre.endsWith(".pdf")) {
      let texto = "";
      try {
        const data = await pdfParse(buffer);
        texto = data.text || "";
      } catch {
        return NextResponse.json(
          { error: "No pude leer este PDF. Exporta el archivo de nuevo o súbelo en Excel o CSV." },
          { status: 422 }
        );
      }
      lectura = leerTexto(texto);
    } else if (FORMATOS_IMAGEN.test(nombre)) {
      return NextResponse.json(
        { error: "Las fotos necesitan análisis con IA, que todavía no está configurado. Sube el archivo en Excel, CSV o PDF." },
        { status: 422 }
      );
    } else {
      return NextResponse.json({ error: "Formato no compatible. Usa Excel, CSV o PDF." }, { status: 415 });
    }

    if (lectura.filas.length === 0) {
      return NextResponse.json(
        { error: "No encontré fechas con descripción en el archivo. No agregué nada." },
        { status: 422 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const plan = await cargarPlan(tx, obraId, contratistaId);
      const clave = (fecha: string, actividad: string) => `${fecha}|${actividad.trim().toLowerCase()}`;
      const existentes = new Set(plan.map((a) => clave(a.fecha.toISOString().slice(0, 10), a.actividad)));

      // No repetir actividades que ya están en el plan ni dos veces dentro del mismo archivo
      const nuevas: { fecha: string; actividad: string }[] = [];
      let duplicadas = 0;
      for (const f of lectura.filas) {
        const k = clave(f.fecha, f.actividad);
        if (existentes.has(k)) {
          duplicadas++;
          continue;
        }
        existentes.add(k);
        nuevas.push(f);
      }

      if (nuevas.length > 0) {
        await insertarFilas(tx, {
          obraId,
          contratistaId,
          creadorId: session.user.id,
          filas: nuevas.map((f) => ({ fecha: isoAFecha(f.fecha), actividad: f.actividad })),
        });
      }
      return { agregadas: nuevas.length, duplicadas, ignoradas: lectura.ignoradas };
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "No se pudo leer el archivo" }, { status: 400 });
  }
}

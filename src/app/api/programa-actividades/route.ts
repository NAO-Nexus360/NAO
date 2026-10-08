import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions, soloLectura } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";
import { cargarPlan, guardarOrden } from "@/lib/programa-actividades";
import { isoAFecha } from "@/lib/fechas-mx";

const createSchema = z.object({
  obraId: z.string(),
  contratistaId: z.string(),
  // Posición (0 = primera fila). Si no viene, se agrega al final del plan.
  posicion: z.number().int().min(0).optional(),
  filas: z
    .array(z.object({ fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), actividad: z.string().min(2) }))
    .min(1, "Agrega al menos una actividad"),
});

const include = { contratista: { select: { id: true, nombre: true } } };

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const obraId = url.searchParams.get("obraId");
  const contratistaIdFilter = url.searchParams.get("contratistaId");
  if (!obraId) return NextResponse.json({ error: "obraId requerido" }, { status: 400 });

  const ok = await userHasObraAccess(session.user.id, obraId);
  if (!ok) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const where: any = { obraId };
  if (session.user.role === "CONTRATISTA" && session.user.contratistaId) {
    where.contratistaId = session.user.contratistaId;
  } else if (contratistaIdFilter) {
    where.contratistaId = contratistaIdFilter;
  }

  const actividades = await prisma.programaActividad.findMany({
    where,
    orderBy: [{ contratistaId: "asc" }, { orden: "asc" }, { createdAt: "asc" }],
    include,
  });

  return NextResponse.json(actividades);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (soloLectura(session.user.role)) {
    return NextResponse.json({ error: "Tu rol no permite capturar el programa de obra" }, { status: 403 });
  }

  try {
    const body = createSchema.parse(await req.json());

    const ok = await userHasObraAccess(session.user.id, body.obraId);
    if (!ok) return NextResponse.json({ error: "Sin acceso a esta obra" }, { status: 403 });

    const creadas = await prisma.$transaction(async (tx) => {
      const plan = await cargarPlan(tx, body.obraId, body.contratistaId);
      const pos = Math.min(body.posicion ?? plan.length, plan.length);

      // Insertar las filas nuevas en la posición pedida y renumerar todo el plan
      const ids = plan.map((a) => a.id);
      const nuevosIds: string[] = [];
      for (const f of body.filas) {
        const creada = await tx.programaActividad.create({
          data: {
            obraId: body.obraId,
            contratistaId: body.contratistaId,
            fecha: isoAFecha(f.fecha),
            actividad: f.actividad,
            creadorId: session.user.id,
          },
        });
        nuevosIds.push(creada.id);
      }
      await guardarOrden(tx, [...ids.slice(0, pos), ...nuevosIds, ...ids.slice(pos)]);

      return tx.programaActividad.findMany({
        where: { id: { in: nuevosIds } },
        include,
        orderBy: { orden: "asc" },
      });
    });

    return NextResponse.json(creadas, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

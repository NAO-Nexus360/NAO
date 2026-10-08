import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions, soloLectura } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";
import { cargarPlan } from "@/lib/programa-actividades";
import { isoAFecha, isoMX, diferenciaDiasHabilesMX, sumarDiasHabilesMX } from "@/lib/fechas-mx";

const include = { contratista: { select: { id: true, nombre: true } } };

// Editar una actividad. Si cambia la fecha y `recorrer` es true, las actividades
// que siguen en el plan se mueven la misma cantidad de días hábiles de México.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (soloLectura(session.user.role)) {
    return NextResponse.json({ error: "Tu rol es solo lectura" }, { status: 403 });
  }

  const actual = await prisma.programaActividad.findUnique({ where: { id: params.id } });
  if (!actual) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const ok = await userHasObraAccess(session.user.id, actual.obraId);
  if (!ok) return NextResponse.json({ error: "Sin acceso a esta obra" }, { status: 403 });

  const body = await req.json();
  const recorrer = body.recorrer !== false;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const data: any = {};
      if ("actividad" in body) data.actividad = body.actividad;

      if ("fecha" in body && body.fecha !== isoMX(actual.fecha)) {
        const nuevaIso: string = body.fecha;
        data.fecha = isoAFecha(nuevaIso);

        if (recorrer) {
          const plan = await cargarPlan(tx, actual.obraId, actual.contratistaId);
          const idx = plan.findIndex((a) => a.id === actual.id);
          const delta = diferenciaDiasHabilesMX(isoMX(actual.fecha), nuevaIso);
          for (const siguiente of plan.slice(idx + 1)) {
            const nueva = sumarDiasHabilesMX(isoMX(siguiente.fecha), delta);
            await tx.programaActividad.update({
              where: { id: siguiente.id },
              data: { fecha: isoAFecha(nueva) },
            });
          }
        }
      }

      await tx.programaActividad.update({ where: { id: params.id }, data });
      return cargarPlan(tx, actual.obraId, actual.contratistaId);
    });

    return NextResponse.json(resultado);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Solo supervisores pueden eliminar" }, { status: 403 });
  }
  await prisma.programaActividad.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

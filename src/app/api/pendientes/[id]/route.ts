import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions, puedeCompletar, puedeEditarPendiente, soloLectura } from "@/lib/auth";
import { Estatus } from "@prisma/client";
import { includeResponsables, limpiarIds, validarResponsables, guardarResponsables } from "@/lib/responsables";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const pendiente = await prisma.pendiente.findUnique({
    where: { id: params.id },
    include: {
      contratista: true,
      ...includeResponsables,
      supervisor: { select: { id: true, name: true } },
      creador: { select: { id: true, name: true } },
      evidencias: { include: { subidoPor: { select: { name: true } } } },
      comentarios: { include: { autor: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      minuta: { select: { id: true, titulo: true, fecha: true } },
      obra: { select: { id: true, nombre: true } },
    },
  });
  if (!pendiente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(pendiente);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (soloLectura(session.user.role)) {
    return NextResponse.json({ error: "Tu rol es solo lectura" }, { status: 403 });
  }
  if (!puedeEditarPendiente(session.user.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const current = await prisma.pendiente.findUnique({ where: { id: params.id }, select: { obraId: true } });
  if (!current) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // 🔒 Solo SUPERVISOR puede marcar COMPLETADO
  if (body.estatus === Estatus.COMPLETADO && !puedeCompletar(session.user.role)) {
    return NextResponse.json(
      { error: "Solo un supervisor puede marcar como Completado. La tarea pasó a 'En revisión'." },
      { status: 403 }
    );
  }

  const data: any = {};
  const allowed = ["tarea", "descripcion", "area", "prioridad", "estatus", "avance", "observaciones", "contratistaId", "supervisorId"];
  for (const k of allowed) if (k in body) data[k] = body[k];
  if (body.fechaEntrega) data.fechaEntrega = new Date(body.fechaEntrega);
  if (body.fechaInicio) data.fechaInicio = new Date(body.fechaInicio);

  // Si RESIDENTE intenta poner avance 100, lo dejamos pero forzamos EN_REVISION
  if (data.avance === 100 && session.user.role !== "SUPERVISOR") {
    data.estatus = Estatus.EN_REVISION;
  }

  // Auto-completar timestamps
  if (data.estatus === Estatus.COMPLETADO) {
    data.fechaCompletado = new Date();
    data.completadoPorId = session.user.id;
    data.avance = 100;
  } else if (body.estatus && body.estatus !== Estatus.COMPLETADO) {
    data.fechaCompletado = null;
    data.completadoPorId = null;
  }

  // Responsables: si vienen en la petición, reemplazan la lista completa
  const cambiaResponsables = "responsableIds" in body || "responsableId" in body;
  const ids = cambiaResponsables ? limpiarIds(body.responsableIds ?? [body.responsableId]) : null;
  if (ids && !(await validarResponsables(current.obraId, ids))) {
    return NextResponse.json({ error: "Solo puedes asignar usuarios de esta obra" }, { status: 400 });
  }
  if (ids) data.responsableId = ids[0] ?? null;

  const pendiente = await prisma.$transaction(async (tx) => {
    await tx.pendiente.update({ where: { id: params.id }, data });
    if (ids) await guardarResponsables(tx, params.id, ids);
    return tx.pendiente.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        contratista: true,
        ...includeResponsables,
        supervisor: { select: { id: true, name: true } },
        _count: { select: { evidencias: true, comentarios: true } },
      },
    });
  });
  return NextResponse.json(pendiente);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Solo supervisores pueden eliminar" }, { status: 403 });
  }
  await prisma.pendiente.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

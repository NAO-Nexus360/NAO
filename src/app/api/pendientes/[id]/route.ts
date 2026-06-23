import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions, puedeCompletar, puedeEditarPendiente, soloLectura } from "@/lib/auth";
import { Estatus } from "@prisma/client";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const pendiente = await prisma.pendiente.findUnique({
    where: { id: params.id },
    include: {
      contratista: true,
      responsable: { select: { id: true, name: true } },
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

  // 🔒 Solo SUPERVISOR puede marcar COMPLETADO
  if (body.estatus === Estatus.COMPLETADO && !puedeCompletar(session.user.role)) {
    return NextResponse.json(
      { error: "Solo un supervisor puede marcar como Completado. La tarea pasó a 'En revisión'." },
      { status: 403 }
    );
  }

  const data: any = {};
  const allowed = ["tarea", "descripcion", "area", "prioridad", "estatus", "avance", "observaciones", "contratistaId", "responsableId", "supervisorId"];
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

  const pendiente = await prisma.pendiente.update({
    where: { id: params.id },
    data,
    include: {
      contratista: true,
      responsable: { select: { id: true, name: true } },
      supervisor: { select: { id: true, name: true } },
      _count: { select: { evidencias: true, comentarios: true } },
    },
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

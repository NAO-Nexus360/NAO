import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions, soloLectura } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const meta = await prisma.meta.findUnique({
    where: { id: params.id },
    include: {
      contratista: { select: { id: true, nombre: true } },
      creador: { select: { id: true, name: true } },
      obra: { select: { id: true, nombre: true } },
    },
  });
  if (!meta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // Si es contratista, solo puede ver metas de su empresa
  if (
    session.user.role === "CONTRATISTA" &&
    meta.contratistaId !== session.user.contratistaId
  ) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  return NextResponse.json(meta);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (soloLectura(session.user.role)) {
    return NextResponse.json({ error: "Tu rol es solo lectura" }, { status: 403 });
  }

  const body = await req.json();
  const data: any = {};

  if ("nombre" in body) data.nombre = body.nombre;
  if ("notas" in body) data.notas = body.notas;
  if ("contratistaId" in body) data.contratistaId = body.contratistaId;
  if ("fechaInicioPlaneada" in body) data.fechaInicioPlaneada = new Date(body.fechaInicioPlaneada);
  if ("fechaFinPlaneada" in body) data.fechaFinPlaneada = new Date(body.fechaFinPlaneada);
  if ("fechaReal" in body) data.fechaReal = body.fechaReal ? new Date(body.fechaReal) : null;

  // Validación de fechas planeadas si ambas vinieron
  if (data.fechaInicioPlaneada && data.fechaFinPlaneada && data.fechaInicioPlaneada > data.fechaFinPlaneada) {
    return NextResponse.json({ error: "Inicio planeado no puede ser posterior a fin planeado" }, { status: 400 });
  }

  const meta = await prisma.meta.update({
    where: { id: params.id },
    data,
    include: {
      contratista: { select: { id: true, nombre: true } },
      creador: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(meta);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Solo supervisores pueden eliminar" }, { status: 403 });
  }
  await prisma.meta.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Agregar un pendiente a una carpeta propia (el pendiente debe ser de la misma obra)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const carpeta = await prisma.carpetaPendientes.findFirst({ where: { id: params.id, usuarioId: session.user.id } });
  if (!carpeta) return NextResponse.json({ error: "Carpeta no encontrada" }, { status: 404 });

  try {
    const { pendienteId } = z.object({ pendienteId: z.string() }).parse(await req.json());
    const pendiente = await prisma.pendiente.findFirst({ where: { id: pendienteId, obraId: carpeta.obraId }, select: { id: true } });
    if (!pendiente) return NextResponse.json({ error: "Pendiente no encontrado en esta obra" }, { status: 400 });

    await prisma.carpetaPendiente.upsert({
      where: { carpetaId_pendienteId: { carpetaId: carpeta.id, pendienteId } },
      create: { carpetaId: carpeta.id, pendienteId },
      update: {},
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// Quitar un pendiente de la carpeta (?pendienteId=...)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const carpeta = await prisma.carpetaPendientes.findFirst({ where: { id: params.id, usuarioId: session.user.id } });
  if (!carpeta) return NextResponse.json({ error: "Carpeta no encontrada" }, { status: 404 });

  const pendienteId = new URL(req.url).searchParams.get("pendienteId");
  if (!pendienteId) return NextResponse.json({ error: "pendienteId requerido" }, { status: 400 });

  await prisma.carpetaPendiente.deleteMany({ where: { carpetaId: carpeta.id, pendienteId } });
  return NextResponse.json({ ok: true });
}

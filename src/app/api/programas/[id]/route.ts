import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Eliminar un programa (solo Supervisor)
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Solo supervisores pueden eliminar" }, { status: 403 });
  }

  const prog = await prisma.programaObra.findUnique({ where: { id: params.id } });
  if (!prog) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.programaObra.delete({ where: { id: params.id } });

  // Si lo que se borró era el "actual", marcar el más reciente que quede como actual
  if (prog.esActual) {
    const masReciente = await prisma.programaObra.findFirst({
      where: { obraId: prog.obraId, contratistaId: prog.contratistaId },
      orderBy: { createdAt: "desc" },
    });
    if (masReciente) {
      await prisma.programaObra.update({
        where: { id: masReciente.id },
        data: { esActual: true },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

// PATCH: marcar como versión actual (revertir a una versión anterior)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  if (body.esActual !== true) {
    return NextResponse.json({ error: "Solo se puede marcar como actual" }, { status: 400 });
  }

  const prog = await prisma.programaObra.findUnique({ where: { id: params.id } });
  if (!prog) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Solo supervisor o residente
  if (session.user.role === "CONTRATISTA") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  // Quitar el flag de los demás de ese contratista en esa obra
  await prisma.programaObra.updateMany({
    where: { obraId: prog.obraId, contratistaId: prog.contratistaId, esActual: true },
    data: { esActual: false },
  });

  // Poner este como actual
  const updated = await prisma.programaObra.update({
    where: { id: params.id },
    data: { esActual: true },
    include: { subidoPor: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}

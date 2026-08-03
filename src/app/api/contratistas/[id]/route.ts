import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Si es contratista, solo puede ver su propia empresa
  if (session.user.role === "CONTRATISTA" && session.user.contratistaId !== params.id) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const contratista = await prisma.contratista.findUnique({
    where: { id: params.id },
    include: {
      obras: { include: { obra: { select: { id: true, nombre: true } } } },
      _count: { select: { pendientes: true, obras: true, usuarios: true } },
    },
  });

  if (!contratista) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json(contratista);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Solo supervisores pueden editar" }, { status: 403 });
  }

  const body = await req.json();
  const data: any = {};
  for (const k of ["nombre", "empresa", "rfc", "telefono", "email"]) {
    if (k in body) data[k] = body[k] || null;
  }

  const contratista = await prisma.contratista.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(contratista);
}

// ELIMINAR contratista (desactivar) — solo Supervisor
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Solo supervisores pueden eliminar contratistas" }, { status: 403 });
  }

  const target = await prisma.contratista.findUnique({ where: { id: params.id } });
  if (!target || !target.activo) {
    return NextResponse.json({ error: "Contratista no encontrado" }, { status: 404 });
  }

  // Desactivación (soft delete): desaparece de listas y selectores, pero las
  // tareas históricas conservan su nombre. También se desactivan sus usuarios
  // vinculados para que ya no puedan entrar al sistema.
  await prisma.$transaction([
    prisma.contratista.update({ where: { id: params.id }, data: { activo: false } }),
    prisma.user.updateMany({ where: { contratistaId: params.id }, data: { activo: false } }),
  ]);

  return NextResponse.json({ ok: true });
}

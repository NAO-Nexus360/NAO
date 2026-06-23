import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const minuta = await prisma.minuta.findUnique({
    where: { id: params.id },
    include: {
      subidoPor: { select: { id: true, name: true } },
      pendientes: { include: { responsable: { select: { name: true } }, contratista: { select: { nombre: true } } } },
    },
  });
  if (!minuta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(minuta);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Solo supervisores" }, { status: 403 });
  await prisma.minuta.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

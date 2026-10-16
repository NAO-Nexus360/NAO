import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions, soloLectura } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";
import { includeResponsables } from "@/lib/responsables";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const minuta = await prisma.minuta.findUnique({
    where: { id: params.id },
    include: {
      subidoPor: { select: { id: true, name: true } },
      pendientes: { include: { ...includeResponsables, contratista: { select: { nombre: true } } } },
    },
  });
  if (!minuta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (!(await userHasObraAccess(session.user.id, minuta.obraId))) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  return NextResponse.json(minuta);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (soloLectura(session.user.role)) return NextResponse.json({ error: "Tu rol es solo lectura" }, { status: 403 });

  const minuta = await prisma.minuta.findUnique({ where: { id: params.id }, select: { obraId: true } });
  if (!minuta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (!(await userHasObraAccess(session.user.id, minuta.obraId))) return NextResponse.json({ error: "Sin acceso a esta obra" }, { status: 403 });

  const { titulo, contenido, fecha } = await req.json();
  const data: { titulo?: string; contenido?: string; fecha?: Date } = {};
  if (titulo !== undefined) {
    if (typeof titulo !== "string" || !titulo.trim()) return NextResponse.json({ error: "El título no puede ir vacío" }, { status: 400 });
    data.titulo = titulo.trim();
  }
  if (contenido !== undefined) {
    if (typeof contenido !== "string" || !contenido.trim()) return NextResponse.json({ error: "El contenido no puede ir vacío" }, { status: 400 });
    data.contenido = contenido;
  }
  if (fecha) {
    const f = new Date(fecha);
    if (isNaN(f.getTime())) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    data.fecha = f;
  }
  const actualizada = await prisma.minuta.update({ where: { id: params.id }, data });
  return NextResponse.json(actualizada);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Solo supervisores" }, { status: 403 });
  await prisma.minuta.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

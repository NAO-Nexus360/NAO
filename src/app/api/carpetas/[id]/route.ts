import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Solo el dueño de la carpeta puede cambiarla o borrarla
async function carpetaDelUsuario(id: string, usuarioId: string) {
  return prisma.carpetaPendientes.findFirst({ where: { id, usuarioId } });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!(await carpetaDelUsuario(params.id, session.user.id))) {
    return NextResponse.json({ error: "Carpeta no encontrada" }, { status: 404 });
  }
  try {
    const { nombre } = z.object({ nombre: z.string().trim().min(1).max(60) }).parse(await req.json());
    const c = await prisma.carpetaPendientes.update({ where: { id: params.id }, data: { nombre } });
    return NextResponse.json({ id: c.id, nombre: c.nombre });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// Borrar la carpeta no borra los pendientes, solo quita la carpeta
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!(await carpetaDelUsuario(params.id, session.user.id))) {
    return NextResponse.json({ error: "Carpeta no encontrada" }, { status: 404 });
  }
  await prisma.carpetaPendientes.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

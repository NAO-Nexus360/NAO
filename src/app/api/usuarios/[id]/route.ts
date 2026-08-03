import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  role: z.nativeEnum(Role).optional(),
  puesto: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  contratistaId: z.string().optional().nullable(),
});

// EDITAR usuario — solo Supervisor
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Solo supervisores pueden editar usuarios" }, { status: 403 });
  }

  try {
    const body = patchSchema.parse(await req.json());

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target || !target.activo) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Protección: no puedes quitarte a ti mismo el rol de Supervisor
    if (params.id === session.user.id && body.role && body.role !== "SUPERVISOR") {
      return NextResponse.json(
        { error: "No puedes quitarte a ti mismo el rol de Supervisor" },
        { status: 400 }
      );
    }

    const data: any = {};
    if (body.name) data.name = body.name;
    if (body.email) {
      const email = body.email.toLowerCase();
      if (email !== target.email) {
        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) return NextResponse.json({ error: "Ese correo ya está registrado" }, { status: 400 });
      }
      data.email = email;
    }
    if (body.password) data.password = await bcrypt.hash(body.password, 10);
    if (body.role) data.role = body.role;
    if ("puesto" in body) data.puesto = body.puesto || null;
    if ("telefono" in body) data.telefono = body.telefono || null;
    if ("contratistaId" in body) data.contratistaId = body.contratistaId || null;

    // Si deja de ser rol Contratista, se desvincula de la empresa
    if (body.role && body.role !== "CONTRATISTA") data.contratistaId = null;

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true, name: true, email: true, role: true,
        puesto: true, telefono: true, contratistaId: true,
        contratista: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json(user);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// ELIMINAR usuario (desactivar) — solo Supervisor
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Solo supervisores pueden eliminar usuarios" }, { status: 403 });
  }

  // Protección: no puedes eliminarte a ti mismo
  if (params.id === session.user.id) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target || !target.activo) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Desactivación (soft delete): el usuario ya no puede entrar ni aparece en
  // listas/selectores, pero su nombre se conserva en el historial de tareas.
  await prisma.user.update({
    where: { id: params.id },
    data: { activo: false },
  });

  // Cierra sus sesiones guardadas (si las hubiera)
  await prisma.session.deleteMany({ where: { userId: params.id } });

  return NextResponse.json({ ok: true });
}

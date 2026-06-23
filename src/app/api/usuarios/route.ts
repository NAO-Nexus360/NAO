import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = new URL(req.url).searchParams.get("role");
  const where: any = { activo: true };
  if (role) where.role = role;
  const usuarios = await prisma.user.findMany({
    where, orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, puesto: true, telefono: true, contratistaId: true, activo: true },
  });
  return NextResponse.json(usuarios);
}

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).default("password123"),
  role: z.nativeEnum(Role),
  puesto: z.string().optional(),
  telefono: z.string().optional(),
  contratistaId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Solo supervisores pueden crear usuarios" }, { status: 403 });

  try {
    const body = schema.parse(await req.json());
    const exists = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (exists) return NextResponse.json({ error: "Ese correo ya está registrado" }, { status: 400 });
    const hash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name, email: body.email.toLowerCase(), password: hash, role: body.role,
        puesto: body.puesto, telefono: body.telefono, contratistaId: body.contratistaId,
      },
      select: { id: true, name: true, email: true, role: true, puesto: true, telefono: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

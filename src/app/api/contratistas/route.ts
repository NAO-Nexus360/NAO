import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const contratistas = await prisma.contratista.findMany({
    where: { activo: true }, orderBy: { nombre: "asc" },
  });
  return NextResponse.json(contratistas);
}

const schema = z.object({
  nombre: z.string().min(2),
  empresa: z.string().optional(),
  rfc: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Solo supervisores" }, { status: 403 });
  try {
    const body = schema.parse(await req.json());
    const c = await prisma.contratista.create({ data: { ...body, email: body.email || null } });
    return NextResponse.json(c, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

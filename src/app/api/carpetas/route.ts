import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";

// Carpetas personales: solo se devuelven las del usuario actual
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const obraId = new URL(req.url).searchParams.get("obraId");
  if (!obraId) return NextResponse.json({ error: "obraId requerido" }, { status: 400 });
  if (!(await userHasObraAccess(session.user.id, obraId))) {
    return NextResponse.json({ error: "Sin acceso a esta obra" }, { status: 403 });
  }

  const carpetas = await prisma.carpetaPendientes.findMany({
    where: { obraId, usuarioId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: { pendientes: { select: { pendienteId: true } } },
  });
  return NextResponse.json(
    carpetas.map((c) => ({ id: c.id, nombre: c.nombre, pendienteIds: c.pendientes.map((p) => p.pendienteId) }))
  );
}

const createSchema = z.object({
  obraId: z.string(),
  nombre: z.string().trim().min(1, "Escribe un nombre").max(60),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = createSchema.parse(await req.json());
    if (!(await userHasObraAccess(session.user.id, body.obraId))) {
      return NextResponse.json({ error: "Sin acceso a esta obra" }, { status: 403 });
    }
    const carpeta = await prisma.carpetaPendientes.create({
      data: { nombre: body.nombre, obraId: body.obraId, usuarioId: session.user.id },
    });
    return NextResponse.json({ id: carpeta.id, nombre: carpeta.nombre, pendienteIds: [] }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

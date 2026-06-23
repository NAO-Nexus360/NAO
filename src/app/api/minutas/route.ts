import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions, soloLectura } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const obraId = new URL(req.url).searchParams.get("obraId");
  if (!obraId) return NextResponse.json({ error: "obraId requerido" }, { status: 400 });

  const ok = await userHasObraAccess(session.user.id, obraId);
  if (!ok) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const minutas = await prisma.minuta.findMany({
    where: { obraId },
    orderBy: { fecha: "desc" },
    include: { subidoPor: { select: { id: true, name: true } }, _count: { select: { pendientes: true } } },
  });
  return NextResponse.json(minutas);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (soloLectura(session.user.role)) return NextResponse.json({ error: "Tu rol es solo lectura" }, { status: 403 });

  const body = await req.json();
  const { obraId, titulo, contenido, archivoUrl, archivoNombre, fecha } = body;
  if (!obraId || !titulo || !contenido) {
    return NextResponse.json({ error: "obraId, título y contenido son requeridos" }, { status: 400 });
  }

  const ok = await userHasObraAccess(session.user.id, obraId);
  if (!ok) return NextResponse.json({ error: "Sin acceso a esta obra" }, { status: 403 });

  const minuta = await prisma.minuta.create({
    data: {
      titulo, contenido, archivoUrl, archivoNombre,
      fecha: fecha ? new Date(fecha) : new Date(),
      obraId, subidoPorId: session.user.id,
    },
  });
  return NextResponse.json(minuta, { status: 201 });
}

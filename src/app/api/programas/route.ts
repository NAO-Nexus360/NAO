import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";

// Listar programas de un contratista en una obra
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const obraId = url.searchParams.get("obraId");
  const contratistaId = url.searchParams.get("contratistaId");
  if (!obraId || !contratistaId) {
    return NextResponse.json({ error: "obraId y contratistaId requeridos" }, { status: 400 });
  }

  const ok = await userHasObraAccess(session.user.id, obraId);
  if (!ok) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  // Si es contratista, solo puede ver los suyos
  if (
    session.user.role === "CONTRATISTA" &&
    session.user.contratistaId !== contratistaId
  ) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const programas = await prisma.programaObra.findMany({
    where: { obraId, contratistaId },
    orderBy: { createdAt: "desc" },
    include: { subidoPor: { select: { id: true, name: true } } },
  });

  return NextResponse.json(programas);
}

// Subir un programa nuevo (los anteriores se marcan esActual=false)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { obraId, contratistaId, url, publicId, nombre, tipo, notas } = body;

    if (!obraId || !contratistaId || !url || !nombre) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const ok = await userHasObraAccess(session.user.id, obraId);
    if (!ok) return NextResponse.json({ error: "Sin acceso a esta obra" }, { status: 403 });

    // Si es contratista, solo puede subir para su empresa
    if (
      session.user.role === "CONTRATISTA" &&
      session.user.contratistaId !== contratistaId
    ) {
      return NextResponse.json({ error: "Solo puedes subir programas de tu empresa" }, { status: 403 });
    }

    // 1) Marcar todos los anteriores como NO actuales
    await prisma.programaObra.updateMany({
      where: { obraId, contratistaId, esActual: true },
      data: { esActual: false },
    });

    // 2) Crear el nuevo como actual
    const programa = await prisma.programaObra.create({
      data: {
        obraId,
        contratistaId,
        nombre,
        url,
        publicId: publicId || null,
        tipo: tipo || "otro",
        notas: notas || null,
        esActual: true,
        subidoPorId: session.user.id,
      },
      include: { subidoPor: { select: { id: true, name: true } } },
    });

    return NextResponse.json(programa, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Agregar evidencia(s) a una meta
// - SUPERVISOR y RESIDENTE: pueden subir a cualquier meta
// - CONTRATISTA: solo a metas de su empresa
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const meta = await prisma.meta.findUnique({
    where: { id: params.id },
    select: { id: true, contratistaId: true, obraId: true },
  });
  if (!meta) return NextResponse.json({ error: "Meta no encontrada" }, { status: 404 });

  if (session.user.role === "CONTRATISTA") {
    if (!session.user.contratistaId || meta.contratistaId !== session.user.contratistaId) {
      return NextResponse.json(
        { error: "Solo puedes subir fotos a metas de tu empresa" },
        { status: 403 }
      );
    }
  }

  const body = await req.json();
  const items = Array.isArray(body.evidencias) ? body.evidencias : [body];

  const created = await Promise.all(
    items.map((e: any) =>
      prisma.evidencia.create({
        data: {
          url: e.url,
          publicId: e.publicId,
          tipo: e.tipo || "image",
          descripcion: e.descripcion,
          metaId: params.id,
          subidoPorId: session.user.id,
        },
        include: { subidoPor: { select: { id: true, name: true } } },
      })
    )
  );

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const evidenciaId = new URL(req.url).searchParams.get("evidenciaId");
  if (!evidenciaId) return NextResponse.json({ error: "evidenciaId requerido" }, { status: 400 });

  const evidencia = await prisma.evidencia.findUnique({
    where: { id: evidenciaId },
    select: { id: true, subidoPorId: true, metaId: true },
  });
  if (!evidencia) return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });

  if (session.user.role === "CONTRATISTA" && evidencia.subidoPorId !== session.user.id) {
    return NextResponse.json(
      { error: "Solo puedes eliminar fotos que tú subiste" },
      { status: 403 }
    );
  }

  await prisma.evidencia.delete({ where: { id: evidenciaId } });
  return NextResponse.json({ ok: true });
}

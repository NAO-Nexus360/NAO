import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST /api/obras/:id/contratistas  → asignar
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Solo supervisores pueden asignar contratistas" }, { status: 403 });
  }

  try {
    const { contratistaId } = await req.json();
    if (!contratistaId) {
      return NextResponse.json({ error: "contratistaId requerido" }, { status: 400 });
    }

    // Verificar que existan obra y contratista
    const [obra, contratista] = await Promise.all([
      prisma.obra.findUnique({ where: { id: params.id } }),
      prisma.contratista.findUnique({ where: { id: contratistaId } }),
    ]);
    if (!obra) return NextResponse.json({ error: "Obra no encontrada" }, { status: 404 });
    if (!contratista) return NextResponse.json({ error: "Contratista no encontrado" }, { status: 404 });

    // Verificar que no esté ya asignado
    const exists = await prisma.obraContratista.findUnique({
      where: { obraId_contratistaId: { obraId: params.id, contratistaId } },
    });
    if (exists) {
      return NextResponse.json({ error: "Ese contratista ya está asignado a esta obra" }, { status: 400 });
    }

    const link = await prisma.obraContratista.create({
      data: { obraId: params.id, contratistaId },
    });
    return NextResponse.json(link, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/obras/:id/contratistas?contratistaId=xxx → desasignar
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Solo supervisores" }, { status: 403 });
  }

  const contratistaId = new URL(req.url).searchParams.get("contratistaId");
  if (!contratistaId) return NextResponse.json({ error: "contratistaId requerido" }, { status: 400 });

  await prisma.obraContratista.delete({
    where: { obraId_contratistaId: { obraId: params.id, contratistaId } },
  });
  return NextResponse.json({ ok: true });
}

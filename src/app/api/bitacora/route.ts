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

  const entries = await prisma.bitacoraEntry.findMany({
    where: { obraId },
    orderBy: { fecha: "desc" },
    include: { autor: { select: { id: true, name: true } }, evidencias: true },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (soloLectura(session.user.role)) return NextResponse.json({ error: "Tu rol es solo lectura" }, { status: 403 });

  const body = await req.json();
  const { obraId, titulo, contenido, avance, clima, personal, fecha, evidencias } = body;
  if (!obraId || !titulo || !contenido) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  const ok = await userHasObraAccess(session.user.id, obraId);
  if (!ok) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const entry = await prisma.bitacoraEntry.create({
    data: {
      titulo, contenido,
      avance: typeof avance === "number" ? avance : null,
      clima: clima || null,
      personal: typeof personal === "number" ? personal : null,
      fecha: fecha ? new Date(fecha) : new Date(),
      obraId, autorId: session.user.id,
      evidencias: Array.isArray(evidencias) && evidencias.length ? {
        create: evidencias.map((e: any) => ({
          url: e.url, publicId: e.publicId, tipo: e.tipo || "image", descripcion: e.descripcion,
          subidoPorId: session.user.id,
        })),
      } : undefined,
    },
    include: { autor: { select: { id: true, name: true } }, evidencias: true },
  });
  return NextResponse.json(entry, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Días de anticipación de la persona actual
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const pref = await prisma.preferenciaRecordatorio.findUnique({ where: { usuarioId: session.user.id } });
  return NextResponse.json({ dias: pref?.dias ?? [] });
}

const schema = z.object({ dias: z.array(z.number().int().min(0).max(30)).max(8) });

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { dias } = schema.parse(await req.json());
    const unicos = Array.from(new Set(dias)).sort((a, b) => a - b);
    await prisma.preferenciaRecordatorio.upsert({
      where: { usuarioId: session.user.id },
      create: { usuarioId: session.user.id, dias: unicos },
      update: { dias: unicos },
    });
    return NextResponse.json({ dias: unicos });
  } catch {
    return NextResponse.json({ error: "Los días deben ser números de 0 a 30 (máximo 8 opciones)" }, { status: 400 });
  }
}

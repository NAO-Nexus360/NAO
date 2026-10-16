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
  return NextResponse.json({ dias: pref?.dias ?? [], hora: pref?.hora ?? 8 });
}

const schema = z.object({
  dias: z.array(z.number().int().min(0).max(30)).max(8),
  hora: z.number().int().min(0).max(23).default(8),
});

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { dias, hora } = schema.parse(await req.json());
    const unicos = Array.from(new Set(dias)).sort((a, b) => a - b);
    await prisma.preferenciaRecordatorio.upsert({
      where: { usuarioId: session.user.id },
      create: { usuarioId: session.user.id, dias: unicos, hora },
      update: { dias: unicos, hora },
    });
    return NextResponse.json({ dias: unicos, hora });
  } catch {
    return NextResponse.json({ error: "Los días deben ser de 0 a 30 (máximo 8 opciones) y la hora de 0 a 23" }, { status: 400 });
  }
}

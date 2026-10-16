import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

// Guardar (o reasignar) el dispositivo de la persona que activa notificaciones
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const body = schema.parse(await req.json());
    await prisma.pushSuscripcion.upsert({
      where: { endpoint: body.endpoint },
      create: {
        usuarioId: session.user.id, endpoint: body.endpoint,
        p256dh: body.keys.p256dh, auth: body.keys.auth,
        agente: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      },
      update: { usuarioId: session.user.id, p256dh: body.keys.p256dh, auth: body.keys.auth },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Suscripción no válida" }, { status: 400 });
  }
}

// Quitar un dispositivo (?endpoint=...) de la persona actual
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const endpoint = new URL(req.url).searchParams.get("endpoint");
  if (!endpoint) return NextResponse.json({ error: "endpoint requerido" }, { status: 400 });
  await prisma.pushSuscripcion.deleteMany({ where: { endpoint, usuarioId: session.user.id } });
  return NextResponse.json({ ok: true });
}

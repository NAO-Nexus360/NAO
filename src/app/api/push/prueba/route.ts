import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enviarPush } from "@/lib/push";

// Envía una notificación de prueba a los dispositivos de la persona actual
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const r = await enviarPush([session.user.id], {
    titulo: "NAO",
    cuerpo: "Las notificaciones están funcionando.",
    url: "/obras",
  });
  return NextResponse.json(r);
}

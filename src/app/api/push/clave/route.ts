import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clavePublicaPush } from "@/lib/push";

// Clave pública que el navegador necesita para suscribirse
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ clave: await clavePublicaPush() });
}

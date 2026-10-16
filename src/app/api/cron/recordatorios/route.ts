import { NextRequest, NextResponse } from "next/server";
import { ejecutarRecordatorios } from "@/lib/recordatorios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lo llama Vercel una vez al día. No repite avisos: lo ya enviado queda registrado.
// Si existe la variable CRON_SECRET, se exige; si no, la ruta es segura igualmente
// porque solo envía lo que corresponde hoy y nunca duplica.
export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    return NextResponse.json(await ejecutarRecordatorios());
  } catch (e: any) {
    console.error("[recordatorios] Error:", e);
    return NextResponse.json({ error: "Error al enviar recordatorios" }, { status: 500 });
  }
}

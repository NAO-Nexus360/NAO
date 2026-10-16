import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Pantallas que la app guarda en el teléfono para abrirlas sin conexión.
// Solo incluye lo que esta persona puede ver (obras a las que pertenece y, si es contratista, solo su empresa).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const obras = await prisma.obra.findMany({
    where: { miembros: { some: { userId: session.user.id } }, activa: true },
    select: { id: true, contratistas: { select: { contratistaId: true } } },
  });

  const esContratista = session.user.role === "CONTRATISTA";
  const urls = new Set<string>(["/obras", "/configuracion"]);
  for (const o of obras) {
    for (const seccion of ["dashboard", "pendientes", "contratistas", "programa", "metas", "minutas", "bitacora"]) {
      urls.add(`/obras/${o.id}/${seccion}`);
    }
    for (const c of o.contratistas) {
      if (esContratista && c.contratistaId !== session.user.contratistaId) continue;
      urls.add(`/obras/${o.id}/contratistas/${c.contratistaId}`);
    }
  }
  return NextResponse.json({ urls: Array.from(urls) });
}

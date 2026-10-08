import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions, soloLectura } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";
import { cargarPlan, guardarOrden } from "@/lib/programa-actividades";

const schema = z.object({
  obraId: z.string(),
  contratistaId: z.string(),
  ids: z.array(z.string()).min(1),
});

// Reordenar el plan de un contratista. Recibe TODOS los ids del plan en el nuevo orden.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (soloLectura(session.user.role)) {
    return NextResponse.json({ error: "Tu rol es solo lectura" }, { status: 403 });
  }

  try {
    const body = schema.parse(await req.json());
    const ok = await userHasObraAccess(session.user.id, body.obraId);
    if (!ok) return NextResponse.json({ error: "Sin acceso a esta obra" }, { status: 403 });

    const resultado = await prisma.$transaction(async (tx) => {
      const plan = await cargarPlan(tx, body.obraId, body.contratistaId);
      const actuales = new Set(plan.map((a) => a.id));
      if (plan.length !== body.ids.length || body.ids.some((id) => !actuales.has(id))) {
        throw new Error("El orden no coincide con el plan actual. Recarga la página.");
      }
      await guardarOrden(tx, body.ids);
      return cargarPlan(tx, body.obraId, body.contratistaId);
    });

    return NextResponse.json(resultado);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

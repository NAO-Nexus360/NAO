import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions, soloLectura } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";

const createSchema = z.object({
  obraId: z.string(),
  contratistaId: z.string(),
  nombre: z.string().min(2),
  notas: z.string().optional(),
  fechaInicioPlaneada: z.string(),
  fechaFinPlaneada: z.string(),
  fechaReal: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const obraId = url.searchParams.get("obraId");
  const contratistaIdFilter = url.searchParams.get("contratistaId");
  if (!obraId) return NextResponse.json({ error: "obraId requerido" }, { status: 400 });

  const ok = await userHasObraAccess(session.user.id, obraId);
  if (!ok) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const where: any = { obraId };

  // Si es contratista, solo ve las metas de su empresa
  if (session.user.role === "CONTRATISTA" && session.user.contratistaId) {
    where.contratistaId = session.user.contratistaId;
  } else if (contratistaIdFilter) {
    where.contratistaId = contratistaIdFilter;
  }

  const metas = await prisma.meta.findMany({
    where,
    orderBy: [{ fechaFinPlaneada: "asc" }],
    include: {
      contratista: { select: { id: true, nombre: true } },
      creador: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(metas);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Solo Supervisor y Residente pueden crear
  if (soloLectura(session.user.role)) {
    return NextResponse.json({ error: "Tu rol no permite crear metas" }, { status: 403 });
  }

  try {
    const body = createSchema.parse(await req.json());

    const ok = await userHasObraAccess(session.user.id, body.obraId);
    if (!ok) return NextResponse.json({ error: "Sin acceso a esta obra" }, { status: 403 });

    // Validar que fechaInicioPlaneada <= fechaFinPlaneada
    if (new Date(body.fechaInicioPlaneada) > new Date(body.fechaFinPlaneada)) {
      return NextResponse.json(
        { error: "La fecha de inicio planeada no puede ser posterior a la fecha de fin planeada" },
        { status: 400 }
      );
    }

    const meta = await prisma.meta.create({
      data: {
        obraId: body.obraId,
        contratistaId: body.contratistaId,
        nombre: body.nombre,
        notas: body.notas,
        fechaInicioPlaneada: new Date(body.fechaInicioPlaneada),
        fechaFinPlaneada: new Date(body.fechaFinPlaneada),
        fechaReal: body.fechaReal ? new Date(body.fechaReal) : null,
        creadorId: session.user.id,
      },
      include: {
        contratista: { select: { id: true, nombre: true } },
        creador: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(meta, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

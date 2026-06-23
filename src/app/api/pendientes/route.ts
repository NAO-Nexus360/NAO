import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions, puedeEditarPendiente, soloLectura } from "@/lib/auth";
import { Area, Estatus, Prioridad } from "@prisma/client";
import { userHasObraAccess } from "@/lib/access";

const createSchema = z.object({
  obraId: z.string(),
  tarea: z.string().min(3),
  descripcion: z.string().optional(),
  area: z.nativeEnum(Area).default(Area.ESTRUCTURA),
  prioridad: z.nativeEnum(Prioridad).default(Prioridad.MEDIA),
  estatus: z.nativeEnum(Estatus).default(Estatus.PENDIENTE),
  avance: z.number().int().min(0).max(100).default(0),
  fechaInicio: z.string(),
  fechaEntrega: z.string(),
  observaciones: z.string().optional(),
  contratistaId: z.string().optional().nullable(),
  responsableId: z.string().optional().nullable(),
  supervisorId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const obraId = url.searchParams.get("obraId");
  const contratistaIdFilter = url.searchParams.get("contratistaId");
  if (!obraId) return NextResponse.json({ error: "obraId requerido" }, { status: 400 });

  const ok = await userHasObraAccess(session.user.id, obraId);
  if (!ok) return NextResponse.json({ error: "Sin acceso a esta obra" }, { status: 403 });

  const where: any = { obraId };

  // Si es contratista, solo ve los pendientes de su empresa
  if (session.user.role === "CONTRATISTA" && session.user.contratistaId) {
    where.contratistaId = session.user.contratistaId;
  } else if (contratistaIdFilter) {
    where.contratistaId = contratistaIdFilter;
  }

  const pendientes = await prisma.pendiente.findMany({
    where,
    orderBy: [{ prioridad: "desc" }, { fechaEntrega: "asc" }],
    include: {
      contratista: { select: { id: true, nombre: true } },
      responsable: { select: { id: true, name: true } },
      supervisor: { select: { id: true, name: true } },
      creador: { select: { id: true, name: true } },
      _count: { select: { evidencias: true, comentarios: true } },
    },
  });

  return NextResponse.json(pendientes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (soloLectura(session.user.role)) {
    return NextResponse.json({ error: "Tu rol no permite crear pendientes" }, { status: 403 });
  }
  if (!puedeEditarPendiente(session.user.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const body = createSchema.parse(await req.json());

    const ok = await userHasObraAccess(session.user.id, body.obraId);
    if (!ok) return NextResponse.json({ error: "Sin acceso a esta obra" }, { status: 403 });

    // Si NO es supervisor y manda estatus COMPLETADO, lo bajamos a EN_REVISION
    if (body.estatus === "COMPLETADO" && session.user.role !== "SUPERVISOR") {
      body.estatus = "EN_REVISION";
    }

    const pendiente = await prisma.pendiente.create({
      data: {
        ...body,
        fechaInicio: new Date(body.fechaInicio),
        fechaEntrega: new Date(body.fechaEntrega),
        creadorId: session.user.id,
      },
      include: {
        contratista: true,
        responsable: { select: { id: true, name: true } },
        supervisor: { select: { id: true, name: true } },
        _count: { select: { evidencias: true, comentarios: true } },
      },
    });
    return NextResponse.json(pendiente, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

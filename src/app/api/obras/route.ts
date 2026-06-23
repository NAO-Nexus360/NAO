import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Supervisor ve todas; los demás solo las suyas
  const where = session.user.role === "SUPERVISOR" ? {} : { miembros: { some: { userId: session.user.id } } };
  const obras = await prisma.obra.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { pendientes: true, miembros: true, contratistas: true } },
      miembros: { include: { user: { select: { id: true, name: true, role: true } } } },
    },
  });
  return NextResponse.json(obras);
}

const schema = z.object({
  nombre: z.string().min(2),
  direccion: z.string().optional().nullable(),
  fechaInicio: z.string().optional().nullable(),
  fechaFinEstimada: z.string().optional().nullable(),
  miembrosIds: z.array(z.string()).optional(),
  contratistasIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Solo supervisores" }, { status: 403 });

  try {
    const body = schema.parse(await req.json());
    const obra = await prisma.obra.create({
      data: {
        nombre: body.nombre,
        direccion: body.direccion,
        fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : null,
        fechaFinEstimada: body.fechaFinEstimada ? new Date(body.fechaFinEstimada) : null,
        creadoPorId: session.user.id,
        miembros: {
          create: [
            { userId: session.user.id }, // creador es miembro
            ...((body.miembrosIds || []).filter((id) => id !== session.user.id).map((userId) => ({ userId }))),
          ],
        },
        contratistas: body.contratistasIds?.length ? {
          create: body.contratistasIds.map((contratistaId) => ({ contratistaId })),
        } : undefined,
      },
    });
    return NextResponse.json(obra, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

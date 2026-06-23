import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Solo supervisores" }, { status: 403 });

  const body = await req.json();
  const data: any = {};
  for (const k of ["nombre", "direccion", "activa"]) if (k in body) data[k] = body[k];
  if (body.fechaInicio !== undefined) data.fechaInicio = body.fechaInicio ? new Date(body.fechaInicio) : null;
  if (body.fechaFinEstimada !== undefined) data.fechaFinEstimada = body.fechaFinEstimada ? new Date(body.fechaFinEstimada) : null;

  if (Array.isArray(body.miembrosIds)) {
    await prisma.obraUser.deleteMany({ where: { obraId: params.id } });
    const ids = Array.from(new Set([session.user.id, ...body.miembrosIds]));
    await prisma.obraUser.createMany({ data: ids.map((userId: string) => ({ obraId: params.id, userId })) });
  }
  if (Array.isArray(body.contratistasIds)) {
    await prisma.obraContratista.deleteMany({ where: { obraId: params.id } });
    if (body.contratistasIds.length) {
      await prisma.obraContratista.createMany({ data: body.contratistasIds.map((cid: string) => ({ obraId: params.id, contratistaId: cid })) });
    }
  }

  const obra = await prisma.obra.update({ where: { id: params.id }, data });
  return NextResponse.json(obra);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "SUPERVISOR") return NextResponse.json({ error: "Solo supervisores" }, { status: 403 });
  await prisma.obra.update({ where: { id: params.id }, data: { activa: false } });
  return NextResponse.json({ ok: true });
}

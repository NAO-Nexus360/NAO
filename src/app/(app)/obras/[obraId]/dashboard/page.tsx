import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Estatus, Prioridad } from "@prisma/client";
import { DashboardClient } from "./dashboard-client";
import { includeResponsables, listaResponsables } from "@/lib/responsables";

export default async function ObraDashboardPage({ params }: { params: { obraId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const ok = await userHasObraAccess(session.user.id, params.obraId);
  if (!ok) notFound();

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  const [obra, total, abiertos, vencidos, criticas, completados, enProgreso, recientes, porArea, avancePromedio, proximas, abiertosConResponsables] = await Promise.all([
    prisma.obra.findUnique({ where: { id: params.obraId } }),
    prisma.pendiente.count({ where: { obraId: params.obraId } }),
    prisma.pendiente.count({ where: { obraId: params.obraId, estatus: { in: [Estatus.PENDIENTE, Estatus.EN_PROGRESO, Estatus.EN_REVISION] } } }),
    prisma.pendiente.count({ where: { obraId: params.obraId, fechaEntrega: { lt: hoy }, estatus: { in: [Estatus.PENDIENTE, Estatus.EN_PROGRESO, Estatus.EN_REVISION] } } }),
    prisma.pendiente.count({ where: { obraId: params.obraId, prioridad: Prioridad.CRITICA, estatus: { in: [Estatus.PENDIENTE, Estatus.EN_PROGRESO, Estatus.EN_REVISION] } } }),
    prisma.pendiente.count({ where: { obraId: params.obraId, estatus: Estatus.COMPLETADO } }),
    prisma.pendiente.count({ where: { obraId: params.obraId, estatus: Estatus.EN_PROGRESO } }),
    prisma.pendiente.findMany({
      where: { obraId: params.obraId },
      orderBy: { updatedAt: "desc" }, take: 8,
      include: { ...includeResponsables, contratista: { select: { nombre: true } } },
    }),
    prisma.pendiente.groupBy({ by: ["area"], where: { obraId: params.obraId }, _count: true }),
    prisma.pendiente.aggregate({ _avg: { avance: true }, where: { obraId: params.obraId, estatus: { not: Estatus.CANCELADO } } }),
    prisma.pendiente.findMany({
      where: { obraId: params.obraId, fechaEntrega: { gte: hoy }, estatus: { in: [Estatus.PENDIENTE, Estatus.EN_PROGRESO, Estatus.EN_REVISION] } },
      orderBy: { fechaEntrega: "asc" }, take: 5,
      include: { ...includeResponsables },
    }),
    prisma.pendiente.findMany({
      where: { obraId: params.obraId, estatus: { in: [Estatus.PENDIENTE, Estatus.EN_PROGRESO, Estatus.EN_REVISION] } },
      include: { ...includeResponsables },
    }),
  ]);

  // Pendientes abiertos por responsable (un pendiente con varios responsables cuenta para cada uno)
  const conteo = new Map<string, { nombre: string; count: number }>();
  let sinResponsable = 0;
  for (const p of abiertosConResponsables) {
    const lista = listaResponsables(p);
    if (lista.length === 0) sinResponsable++;
    for (const r of lista) {
      const actual = conteo.get(r.id) ?? { nombre: r.name, count: 0 };
      actual.count++;
      conteo.set(r.id, actual);
    }
  }
  const porResponsable = Array.from(conteo.values()).sort((a, b) => b.count - a.count);

  if (!obra) notFound();

  return (
    <DashboardClient
      obra={JSON.parse(JSON.stringify(obra))}
      data={{
        total, pendientesAbiertos: abiertos, vencidos, criticas, completados, enProgreso,
        avanceGeneral: Math.round(avancePromedio._avg.avance ?? 0),
        recientes: JSON.parse(JSON.stringify(recientes)),
        porArea, proximas: JSON.parse(JSON.stringify(proximas)),
        porResponsable, sinResponsable,
      }}
    />
  );
}

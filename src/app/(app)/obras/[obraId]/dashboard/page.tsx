import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Estatus, Prioridad } from "@prisma/client";
import { DashboardClient } from "./dashboard-client";

export default async function ObraDashboardPage({ params }: { params: { obraId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const ok = await userHasObraAccess(session.user.id, params.obraId);
  if (!ok) notFound();

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  const [obra, total, abiertos, vencidos, criticas, completados, enProgreso, recientes, porArea, avancePromedio, proximas] = await Promise.all([
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
      include: { responsable: { select: { name: true } }, contratista: { select: { nombre: true } } },
    }),
    prisma.pendiente.groupBy({ by: ["area"], where: { obraId: params.obraId }, _count: true }),
    prisma.pendiente.aggregate({ _avg: { avance: true }, where: { obraId: params.obraId, estatus: { not: Estatus.CANCELADO } } }),
    prisma.pendiente.findMany({
      where: { obraId: params.obraId, fechaEntrega: { gte: hoy }, estatus: { in: [Estatus.PENDIENTE, Estatus.EN_PROGRESO, Estatus.EN_REVISION] } },
      orderBy: { fechaEntrega: "asc" }, take: 5,
      include: { responsable: { select: { name: true } } },
    }),
  ]);

  if (!obra) notFound();

  return (
    <DashboardClient
      obra={JSON.parse(JSON.stringify(obra))}
      data={{
        total, pendientesAbiertos: abiertos, vencidos, criticas, completados, enProgreso,
        avanceGeneral: Math.round(avancePromedio._avg.avance ?? 0),
        recientes: JSON.parse(JSON.stringify(recientes)),
        porArea, proximas: JSON.parse(JSON.stringify(proximas)),
      }}
    />
  );
}

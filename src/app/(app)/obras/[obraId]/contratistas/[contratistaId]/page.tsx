import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Estatus } from "@prisma/client";
import { ContratistaDetailClient } from "./client";

export default async function ContratistaDetailPage({
  params,
}: {
  params: { obraId: string; contratistaId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const ok = await userHasObraAccess(session.user.id, params.obraId);
  if (!ok) notFound();

  // Si el usuario es CONTRATISTA, solo puede ver SU propia empresa
  if (
    session.user.role === "CONTRATISTA" &&
    session.user.contratistaId !== params.contratistaId
  ) {
    notFound();
  }

  const [obra, contratista, pendientes, metas, programas] = await Promise.all([
    prisma.obra.findUnique({ where: { id: params.obraId } }),
    prisma.contratista.findUnique({
      where: { id: params.contratistaId },
      include: {
        usuarios: { select: { id: true, name: true, email: true, telefono: true } },
      },
    }),
    prisma.pendiente.findMany({
      where: { obraId: params.obraId, contratistaId: params.contratistaId },
      orderBy: [{ estatus: "asc" }, { fechaEntrega: "asc" }],
      include: {
        responsable: { select: { id: true, name: true } },
        supervisor: { select: { id: true, name: true } },
        _count: { select: { evidencias: true, comentarios: true } },
      },
    }),
    prisma.meta.findMany({
      where: { obraId: params.obraId, contratistaId: params.contratistaId },
      orderBy: { fechaFinPlaneada: "asc" },
    }),
    prisma.programaObra.findMany({
      where: { obraId: params.obraId, contratistaId: params.contratistaId },
      orderBy: { createdAt: "desc" },
      include: { subidoPor: { select: { id: true, name: true } } },
    }),
  ]);

  if (!obra || !contratista) notFound();

  // Calcular métricas
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const total = pendientes.length;
  const completados = pendientes.filter((p: any) => p.estatus === Estatus.COMPLETADO);
  const pendientesAbiertos = pendientes.filter((p: any) =>
    [Estatus.PENDIENTE, Estatus.EN_PROGRESO, Estatus.EN_REVISION].includes(p.estatus)
  );
  const enProgreso = pendientes.filter((p: any) => p.estatus === Estatus.EN_PROGRESO).length;
  const enPendiente = pendientes.filter((p: any) => p.estatus === Estatus.PENDIENTE).length;
  const enRevision = pendientes.filter((p: any) => p.estatus === Estatus.EN_REVISION).length;
  const vencidos = pendientesAbiertos.filter(
    (p: any) => new Date(p.fechaEntrega) < hoy
  ).length;

  // % cumplimiento
  const noCancelados = pendientes.filter((p: any) => p.estatus !== Estatus.CANCELADO);
  const cumplimiento =
    noCancelados.length > 0
      ? Math.round((completados.length / noCancelados.length) * 100)
      : 0;

  // Tiempo promedio en completar (días entre fechaInicio y fechaCompletado)
  const tiemposCompletado = completados
    .filter((p: any) => p.fechaCompletado)
    .map((p: any) => {
      const inicio = new Date(p.fechaInicio || p.fechaCreacion).getTime();
      const fin = new Date(p.fechaCompletado!).getTime();
      return Math.max(0, (fin - inicio) / (1000 * 60 * 60 * 24));
    });
  const tiempoPromedio = tiemposCompletado.length
    ? Math.round(tiemposCompletado.reduce((a: number, b: number) => a + b, 0) / tiemposCompletado.length)
    : null;

  // % entregado a tiempo (de los completados)
  const aTiempo = completados.filter(
    (p: any) => p.fechaCompletado && new Date(p.fechaCompletado) <= new Date(p.fechaEntrega)
  ).length;
  const pctATiempo = completados.length
    ? Math.round((aTiempo / completados.length) * 100)
    : null;

  // Por área
  const porArea: Record<string, number> = {};
  pendientes.forEach((p: any) => {
    porArea[p.area] = (porArea[p.area] || 0) + 1;
  });

  return (
    <ContratistaDetailClient
      obra={JSON.parse(JSON.stringify(obra))}
      contratista={JSON.parse(JSON.stringify(contratista))}
      pendientes={JSON.parse(JSON.stringify(pendientes))}
      metas={JSON.parse(JSON.stringify(metas))}
      programas={JSON.parse(JSON.stringify(programas))}
      user={session.user as any}
      stats={{
        total,
        completados: completados.length,
        pendientesAbiertos: pendientesAbiertos.length,
        enPendiente,
        enProgreso,
        enRevision,
        vencidos,
        cumplimiento,
        tiempoPromedio,
        pctATiempo,
        porArea,
      }}
    />
  );
}

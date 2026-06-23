import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PendientesClient } from "./pendientes-client";

export default async function PendientesPage({ params }: { params: { obraId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const ok = await userHasObraAccess(session.user.id, params.obraId);
  if (!ok) notFound();

  const where: any = { obraId: params.obraId };
  if (session.user.role === "CONTRATISTA" && session.user.contratistaId) {
    where.contratistaId = session.user.contratistaId;
  }

  const [obra, pendientes, usuarios, contratistas] = await Promise.all([
    prisma.obra.findUnique({ where: { id: params.obraId } }),
    prisma.pendiente.findMany({
      where,
      orderBy: [{ prioridad: "desc" }, { fechaEntrega: "asc" }],
      include: {
        contratista: { select: { id: true, nombre: true } },
        responsable: { select: { id: true, name: true } },
        supervisor: { select: { id: true, name: true } },
        evidencias: { include: { subidoPor: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
        _count: { select: { evidencias: true, comentarios: true } },
      },
    }),
    prisma.user.findMany({
      where: { activo: true, obrasAsignadas: { some: { obraId: params.obraId } } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.contratista.findMany({
      where: { activo: true, obras: { some: { obraId: params.obraId } } },
      select: { id: true, nombre: true, empresa: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  if (!obra) notFound();

  return (
    <PendientesClient
      obra={JSON.parse(JSON.stringify(obra))}
      user={session.user as any}
      initial={{
        pendientes: JSON.parse(JSON.stringify(pendientes)),
        usuarios, contratistas,
      }}
    />
  );
}

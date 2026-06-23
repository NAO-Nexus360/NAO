import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { MetasClient } from "./metas-client";

export default async function MetasPage({ params }: { params: { obraId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const ok = await userHasObraAccess(session.user.id, params.obraId);
  if (!ok) notFound();

  const where: any = { obraId: params.obraId };
  if (session.user.role === "CONTRATISTA" && session.user.contratistaId) {
    where.contratistaId = session.user.contratistaId;
  }

  const [obra, metas, contratistas] = await Promise.all([
    prisma.obra.findUnique({ where: { id: params.obraId } }),
    prisma.meta.findMany({
      where,
      orderBy: [{ fechaFinPlaneada: "asc" }],
      include: {
        contratista: { select: { id: true, nombre: true } },
        creador: { select: { id: true, name: true } },
        evidencias: { include: { subidoPor: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.contratista.findMany({
      where: { activo: true, obras: { some: { obraId: params.obraId } } },
      select: { id: true, nombre: true, empresa: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  if (!obra) notFound();

  return (
    <MetasClient
      obra={JSON.parse(JSON.stringify(obra))}
      user={session.user as any}
      initial={{
        metas: JSON.parse(JSON.stringify(metas)),
        contratistas,
      }}
    />
  );
}

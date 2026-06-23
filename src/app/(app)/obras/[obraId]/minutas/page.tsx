import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { MinutasClient } from "./minutas-client";

export default async function MinutasPage({ params }: { params: { obraId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const ok = await userHasObraAccess(session.user.id, params.obraId);
  if (!ok) notFound();

  const [obra, minutas] = await Promise.all([
    prisma.obra.findUnique({ where: { id: params.obraId } }),
    prisma.minuta.findMany({
      where: { obraId: params.obraId },
      orderBy: { fecha: "desc" },
      include: { subidoPor: { select: { id: true, name: true } }, _count: { select: { pendientes: true } } },
    }),
  ]);

  if (!obra) notFound();

  return (
    <MinutasClient
      obra={JSON.parse(JSON.stringify(obra))}
      user={session.user as any}
      initial={{ minutas: JSON.parse(JSON.stringify(minutas)) }}
    />
  );
}

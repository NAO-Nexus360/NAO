import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { BitacoraClient } from "./bitacora-client";

export default async function BitacoraPage({ params }: { params: { obraId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const ok = await userHasObraAccess(session.user.id, params.obraId);
  if (!ok) notFound();

  const [obra, entries] = await Promise.all([
    prisma.obra.findUnique({ where: { id: params.obraId } }),
    prisma.bitacoraEntry.findMany({
      where: { obraId: params.obraId },
      orderBy: { fecha: "desc" },
      include: { autor: { select: { id: true, name: true } }, evidencias: true },
    }),
  ]);
  if (!obra) notFound();

  return (
    <BitacoraClient
      obra={JSON.parse(JSON.stringify(obra))}
      user={session.user as any}
      initial={{ entries: JSON.parse(JSON.stringify(entries)) }}
    />
  );
}

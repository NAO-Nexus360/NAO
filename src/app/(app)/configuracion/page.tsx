import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConfiguracionClient } from "./configuracion-client";

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const pref = await prisma.preferenciaRecordatorio.findUnique({ where: { usuarioId: session.user.id } });
  return <ConfiguracionClient diasIniciales={pref?.dias ?? []} />;
}

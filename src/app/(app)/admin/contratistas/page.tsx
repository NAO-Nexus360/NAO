import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminContratistasClient } from "./client";

export default async function AdminContratistasPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "SUPERVISOR") redirect("/obras");

  const contratistas = await prisma.contratista.findMany({
    where: { activo: true }, orderBy: { nombre: "asc" },
    include: { _count: { select: { pendientes: true, obras: true, usuarios: true } } },
  });

  return <AdminContratistasClient initial={{ contratistas: JSON.parse(JSON.stringify(contratistas)) }} />;
}

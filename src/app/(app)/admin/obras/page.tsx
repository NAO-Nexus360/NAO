import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminObrasClient } from "./client";

export default async function AdminObrasPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "SUPERVISOR") redirect("/obras");

  const [obras, usuarios, contratistas] = await Promise.all([
    prisma.obra.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { pendientes: true, miembros: true, contratistas: true } },
        miembros: { include: { user: { select: { id: true, name: true, role: true } } } },
        contratistas: { include: { contratista: { select: { id: true, nombre: true } } } },
      },
    }),
    prisma.user.findMany({
      where: { activo: true },
      select: { id: true, name: true, role: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.contratista.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);

  return <AdminObrasClient
    initial={{
      obras: JSON.parse(JSON.stringify(obras)),
      usuarios, contratistas,
    }}
  />;
}

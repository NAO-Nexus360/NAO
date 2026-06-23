import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminUsuariosClient } from "./client";

export default async function AdminUsuariosPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "SUPERVISOR") redirect("/obras");

  const [usuarios, contratistas] = await Promise.all([
    prisma.user.findMany({
      where: { activo: true },
      select: { id: true, name: true, email: true, role: true, puesto: true, telefono: true, contratistaId: true,
        contratista: { select: { id: true, nombre: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.contratista.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);

  return <AdminUsuariosClient initial={{ usuarios, contratistas }} />;
}

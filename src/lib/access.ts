import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Devuelve la sesión activa o null.
 */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  return session;
}

/**
 * Verifica si el usuario está asignado a la obra.
 */
export async function userHasObraAccess(userId: string, obraId: string): Promise<boolean> {
  const link = await prisma.obraUser.findUnique({
    where: { obraId_userId: { obraId, userId } },
  });
  return !!link;
}

/**
 * Devuelve todas las obras donde el usuario es miembro.
 */
export async function getUserObras(userId: string) {
  return prisma.obra.findMany({
    where: { miembros: { some: { userId } }, activa: true },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { pendientes: true, miembros: true } },
    },
  });
}

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

// Plan de un contratista en una obra, en su orden actual
export async function cargarPlan(tx: Tx | typeof prisma, obraId: string, contratistaId: string) {
  return tx.programaActividad.findMany({
    where: { obraId, contratistaId },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
  });
}

// Reasigna orden 0..n-1 según la lista de ids recibida
export async function guardarOrden(tx: Tx, ids: string[]) {
  for (let i = 0; i < ids.length; i++) {
    await tx.programaActividad.update({ where: { id: ids[i] }, data: { orden: i } });
  }
}

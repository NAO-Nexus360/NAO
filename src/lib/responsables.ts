// Responsables de un pendiente (varios por pendiente). Lo que sirve en el navegador está en responsables-vista.ts.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export { includeResponsables, listaResponsables, textoResponsables } from "@/lib/responsables-vista";

// Quita repetidos y vacíos
export function limpiarIds(ids: (string | null | undefined)[] | null | undefined): string[] {
  return Array.from(new Set((ids || []).filter((x): x is string => !!x)));
}

// Solo se pueden asignar usuarios que estén en la obra
export async function validarResponsables(obraId: string, ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const n = await prisma.obraUser.count({ where: { obraId, userId: { in: ids } } });
  return n === ids.length;
}

// Reemplaza los responsables de un pendiente y actualiza el responsable principal
export async function guardarResponsables(tx: Prisma.TransactionClient, pendienteId: string, ids: string[]) {
  await tx.pendienteResponsable.deleteMany({ where: { pendienteId } });
  if (ids.length > 0) {
    await tx.pendienteResponsable.createMany({ data: ids.map((userId) => ({ pendienteId, userId })) });
  }
  await tx.pendiente.update({ where: { id: pendienteId }, data: { responsableId: ids[0] ?? null } });
}

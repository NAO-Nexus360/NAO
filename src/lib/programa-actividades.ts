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

// Inserta filas nuevas en el plan en la posición indicada (por defecto, al final) y renumera el plan
export async function insertarFilas(
  tx: Tx,
  opts: {
    obraId: string;
    contratistaId: string;
    creadorId: string;
    filas: { fecha: Date; actividad: string }[];
    posicion?: number;
  }
) {
  const plan = await cargarPlan(tx, opts.obraId, opts.contratistaId);
  const pos = Math.min(opts.posicion ?? plan.length, plan.length);

  const nuevosIds: string[] = [];
  for (const f of opts.filas) {
    const creada = await tx.programaActividad.create({
      data: {
        obraId: opts.obraId,
        contratistaId: opts.contratistaId,
        fecha: f.fecha,
        actividad: f.actividad,
        creadorId: opts.creadorId,
      },
    });
    nuevosIds.push(creada.id);
  }

  const ids = plan.map((a) => a.id);
  await guardarOrden(tx, [...ids.slice(0, pos), ...nuevosIds, ...ids.slice(pos)]);
  return nuevosIds;
}

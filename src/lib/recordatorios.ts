// Envío de recordatorios de vencimiento: cada persona recibe una notificación
// N días antes de la fecha de entrega de los pendientes abiertos que le corresponden
// (los que tiene como responsable y los de la empresa contratista a la que pertenece).
import { Estatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hoyMX } from "@/lib/fechas-mx";
import { enviarPush } from "@/lib/push";
import { includeResponsables, listaResponsables } from "@/lib/responsables";
import {
  calcularRecordatorios, claveRecordatorio, cuerpoRecordatorio, tituloRecordatorio, PendienteRecordable,
} from "@/lib/recordatorios-calculo";

export async function ejecutarRecordatorios() {
  const hoy = hoyMX();
  const preferencias = await prisma.preferenciaRecordatorio.findMany({ where: { NOT: { dias: { isEmpty: true } } } });
  if (preferencias.length === 0) return { personas: 0, pendientes: 0, avisos: 0, enviados: 0 };

  const prefMap = new Map(preferencias.map((p) => [p.usuarioId, p.dias]));
  const maxDias = Math.max(...preferencias.flatMap((p) => p.dias));
  const desde = new Date(`${hoy}T00:00:00Z`);
  const hasta = new Date(desde.getTime() + maxDias * 86400000);

  const pendientes = await prisma.pendiente.findMany({
    where: {
      estatus: { in: [Estatus.PENDIENTE, Estatus.EN_PROGRESO, Estatus.EN_REVISION] },
      fechaEntrega: { gte: desde, lte: hasta },
    },
    include: { ...includeResponsables, obra: { select: { id: true, nombre: true } } },
  });

  const empresaIds = Array.from(new Set(pendientes.map((p) => p.contratistaId).filter((x): x is string => !!x)));
  const usuariosEmpresa = empresaIds.length
    ? await prisma.user.findMany({ where: { contratistaId: { in: empresaIds }, activo: true }, select: { id: true, contratistaId: true } })
    : [];

  const recordables: PendienteRecordable[] = pendientes.map((p) => ({
    id: p.id,
    tarea: p.tarea,
    obraId: p.obra.id,
    obraNombre: p.obra.nombre,
    fechaEntrega: p.fechaEntrega.toISOString().slice(0, 10),
    usuarioIds: [
      ...listaResponsables(p).map((r) => r.id),
      ...usuariosEmpresa.filter((u) => u.contratistaId === p.contratistaId).map((u) => u.id),
    ].filter((id) => prefMap.has(id)),
  }));

  const previos = await prisma.recordatorioEnviado.findMany({
    where: { pendienteId: { in: pendientes.map((p) => p.id) }, usuarioId: { in: Array.from(prefMap.keys()) } },
  });
  const yaEnviados = new Set(previos.map((r) => claveRecordatorio(r.usuarioId, r.pendienteId, r.dias, r.fechaEntrega)));

  const avisos = calcularRecordatorios(recordables, prefMap, hoy, yaEnviados);
  let enviados = 0;
  for (const a of avisos) {
    const unico = a.pendientes.length === 1 ? a.pendientes[0] : null;
    const r = await enviarPush([a.usuarioId], {
      titulo: tituloRecordatorio(a.dias),
      cuerpo: unico ? `${unico.tarea} (${unico.obraNombre})` : cuerpoRecordatorio(a.pendientes),
      url: unico ? `/obras/${unico.obraId}/pendientes` : "/obras",
    });
    if (r.enviados > 0) {
      enviados += r.enviados;
      await prisma.recordatorioEnviado.createMany({
        data: a.pendientes.map((p) => ({ usuarioId: a.usuarioId, pendienteId: p.id, dias: a.dias, fechaEntrega: p.fechaEntrega })),
        skipDuplicates: true,
      });
    }
  }
  return { personas: preferencias.length, pendientes: pendientes.length, avisos: avisos.length, enviados };
}

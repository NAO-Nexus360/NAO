// Funciones de presentación de responsables (sin base de datos: se pueden usar en componentes del navegador)
export type Persona = { id: string; name: string; email?: string | null };

// Campos a incluir en las consultas de Pendiente para poder leer sus responsables
export const includeResponsables = {
  responsable: { select: { id: true, name: true, email: true } },
  responsables: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

// Lista de responsables de un pendiente ya consultado con includeResponsables
export function listaResponsables(p: any): Persona[] {
  if (p.responsables?.length) return p.responsables.map((r: any) => r.user);
  return p.responsable ? [p.responsable] : [];
}

// Texto para tablas y tarjetas: hasta dos nombres; si hay más, "+N" con los que sobran
export function textoResponsables(lista: { name: string }[]): string {
  if (lista.length === 0) return "—";
  if (lista.length <= 2) return lista.map((r) => r.name).join(", ");
  return `${lista[0].name}, ${lista[1].name} +${lista.length - 2}`;
}

import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userHasObraAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { ContratistasObraClient } from "./client";

export default async function ContratistasObraPage({ params }: { params: { obraId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const ok = await userHasObraAccess(session.user.id, params.obraId);
  if (!ok) notFound();

  const obra = await prisma.obra.findUnique({ where: { id: params.obraId } });
  if (!obra) notFound();

  // Contratistas asignados a la obra (con sus pendientes para stats)
  let contratistasObra = await prisma.obraContratista.findMany({
    where: { obraId: params.obraId },
    include: {
      contratista: {
        include: {
          pendientes: {
            where: { obraId: params.obraId },
            select: { estatus: true, fechaEntrega: true },
          },
        },
      },
    },
  });

  // Si el usuario es CONTRATISTA, solo ve su propia empresa
  if (session.user.role === "CONTRATISTA") {
    contratistasObra = contratistasObra.filter(
      (oc: any) => oc.contratistaId === session.user.contratistaId
    );
  }

  // Todos los contratistas (para el botón "Asignar a esta obra")
  const todosContratistas = await prisma.contratista.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, empresa: true },
    orderBy: { nombre: "asc" },
  });

  // IDs de los ya asignados, para excluirlos del modal
  const yaAsignadosIds = contratistasObra.map((oc: any) => oc.contratistaId);
  const disponibles = todosContratistas.filter((c: any) => !yaAsignadosIds.includes(c.id));

  return (
    <ContratistasObraClient
      obra={JSON.parse(JSON.stringify(obra))}
      contratistasObra={JSON.parse(JSON.stringify(contratistasObra))}
      contratistasDisponibles={disponibles}
      user={session.user as any}
    />
  );
}

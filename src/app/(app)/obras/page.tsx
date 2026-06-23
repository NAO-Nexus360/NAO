import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserObras } from "@/lib/access";
import { Card, CardContent } from "@/components/ui/card";
import { Building, MapPin, Calendar, Users, ListTodo, Plus, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default async function ObrasPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const obras = await getUserObras(session.user.id);
  const isSupervisor = session.user.role === "SUPERVISOR";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mis obras</h1>
          <p className="text-sm text-slate-500 mt-1">
            {obras.length === 0
              ? "Aún no tienes obras asignadas"
              : `Tienes ${obras.length} obra${obras.length !== 1 ? "s" : ""} ${obras.length === 1 ? "asignada" : "asignadas"}`}
          </p>
        </div>
        {isSupervisor && (
          <Button asChild>
            <Link href="/admin/obras">
              <Plus className="h-4 w-4" /> Gestionar obras
            </Link>
          </Button>
        )}
      </div>

      {obras.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Building className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No tienes obras asignadas</p>
            <p className="text-sm text-slate-400 mt-1">
              {isSupervisor
                ? "Crea tu primera obra desde Administración"
                : "Pide a tu supervisor que te asigne a una obra"}
            </p>
            {isSupervisor && (
              <Button asChild className="mt-4">
                <Link href="/admin/obras"><Plus className="h-4 w-4" /> Crear obra</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {obras.map((obra: any) => (
            <Link key={obra.id} href={`/obras/${obra.id}/dashboard`} className="group">
              <Card className="h-full hover:shadow-lg hover:border-blue-200 transition-all overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Building className="h-5 w-5 text-blue-600" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mt-3 line-clamp-1">{obra.nombre}</h3>
                  {obra.direccion && (
                    <p className="text-xs text-slate-500 mt-1 flex items-start gap-1 line-clamp-2">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" /> {obra.direccion}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                    <div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <ListTodo className="h-3 w-3" /> Pendientes
                      </div>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">{obra._count?.pendientes ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Users className="h-3 w-3" /> Equipo
                      </div>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">{obra._count?.miembros ?? 0}</div>
                    </div>
                  </div>
                  {(obra.fechaInicio || obra.fechaFinEstimada) && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {obra.fechaInicio && <span>{formatDate(obra.fechaInicio)}</span>}
                      {obra.fechaInicio && obra.fechaFinEstimada && <span>→</span>}
                      {obra.fechaFinEstimada && <span>{formatDate(obra.fechaFinEstimada)}</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

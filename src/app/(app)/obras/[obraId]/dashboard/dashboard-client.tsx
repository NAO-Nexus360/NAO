"use client";
import Link from "next/link";
import { ListChecks, AlertOctagon, AlertTriangle, CheckCircle2, TrendingUp, Calendar, ArrowRight, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PrioridadBadge, EstatusBadge, AreaBadge, AREA_LABEL, AREA_COLOR } from "@/components/common/badges";
import { formatDate, isOverdue, diasRestantes, cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const AREA_HEX: Record<string, string> = {
  ESTRUCTURA: "#78716c", OBRA_CIVIL: "#d97706", OBRA_BLANCA: "#71717a",
  INSTALACIONES: "#06b6d4", ACABADOS: "#ec4899", PROYECTO: "#6366f1",
  ADMINISTRATIVO: "#64748b", VENTA: "#10b981", POSTVENTA: "#14b8a6",
};

export function DashboardClient({ obra, data }: { obra: any; data: any }) {
  const pieData = data.porArea.map((c: any) => ({
    name: AREA_LABEL[c.area] || c.area, value: c._count, fill: AREA_HEX[c.area] || "#64748b",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{obra.nombre}</h1>
          {obra.direccion && (
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {obra.direccion}
            </p>
          )}
        </div>
        <Link href={`/obras/${obra.id}/pendientes`} className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
          Ver todos los pendientes <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total pendientes" value={data.pendientesAbiertos} subValue={`de ${data.total} totales`} icon={ListChecks} color="blue" />
        <KpiCard label="Vencidos" value={data.vencidos} subValue="requieren atención" icon={AlertOctagon} color="red" highlight={data.vencidos > 0} />
        <KpiCard label="Críticas" value={data.criticas} subValue="prioridad máxima" icon={AlertTriangle} color="orange" />
        <KpiCard label="Completados" value={data.completados} subValue="esta obra" icon={CheckCircle2} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-blue-600" /> Avance general</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-40 h-40">
                <svg className="w-40 h-40 -rotate-90">
                  <circle cx="80" cy="80" r="68" strokeWidth="14" stroke="#e2e8f0" fill="transparent" />
                  <circle cx="80" cy="80" r="68" strokeWidth="14" stroke="url(#grad)" fill="transparent" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 68} strokeDashoffset={2 * Math.PI * 68 * (1 - data.avanceGeneral / 100)}
                    className="transition-all duration-1000" />
                  <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-900">{data.avanceGeneral}%</span>
                  <span className="text-xs text-slate-500 mt-1">avance promedio</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full mt-6 text-center">
                <div className="rounded-lg bg-blue-50 p-3">
                  <div className="text-xl font-bold text-blue-700">{data.enProgreso}</div>
                  <div className="text-xs text-blue-600 mt-0.5">En progreso</div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3">
                  <div className="text-xl font-bold text-emerald-700">{data.completados}</div>
                  <div className="text-xs text-emerald-600 mt-0.5">Completadas</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Pendientes por área</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Sin datos</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {pieData.map((d: any, i: number) => (<Cell key={i} fill={d.fill} />))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1.5 mt-2 text-xs">
                  {pieData.map((d: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                      <span className="text-slate-600 truncate">{d.name}</span>
                      <span className="ml-auto font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4 text-violet-600" /> Próximas entregas</CardTitle></CardHeader>
          <CardContent>
            {data.proximas.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Sin entregas próximas</p>
            ) : (
              <div className="space-y-3">
                {data.proximas.map((p: any) => {
                  const dias = diasRestantes(p.fechaEntrega);
                  return (
                    <Link key={p.id} href={`/obras/${obra.id}/pendientes`} className="block rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900 line-clamp-1">{p.tarea}</p>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0",
                          dias === 0 ? "bg-amber-100 text-amber-700 border-amber-200" :
                          dias <= 2 ? "bg-orange-100 text-orange-700 border-orange-200" :
                          "bg-slate-100 text-slate-600 border-slate-200")}>
                          {dias === 0 ? "Hoy" : `${dias}d`}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{p.responsable?.name || "Sin responsable"} · {formatDate(p.fechaEntrega)}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Actividades recientes</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Últimas actualizaciones</p>
          </div>
          <Link href={`/obras/${obra.id}/pendientes`} className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
            Ver todo <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarea</TableHead><TableHead>Área</TableHead><TableHead>Responsable</TableHead>
                  <TableHead>Entrega</TableHead><TableHead>Prioridad</TableHead><TableHead>Estatus</TableHead>
                  <TableHead className="w-32">Avance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recientes.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-slate-500 py-8">Aún no hay pendientes</TableCell></TableRow>
                ) : (
                  data.recientes.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-xs">
                        <p className="font-medium text-sm text-slate-900 line-clamp-1">{p.tarea}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{p.contratista?.nombre || "Sin contratista"}</p>
                      </TableCell>
                      <TableCell><AreaBadge value={p.area} /></TableCell>
                      <TableCell className="text-sm">{p.responsable?.name || "—"}</TableCell>
                      <TableCell>
                        <span className={cn("text-sm", isOverdue(p.fechaEntrega, p.estatus) && "text-red-600 font-semibold")}>{formatDate(p.fechaEntrega)}</span>
                      </TableCell>
                      <TableCell><PrioridadBadge value={p.prioridad} /></TableCell>
                      <TableCell><EstatusBadge value={p.estatus} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={p.avance} className="h-1.5" />
                          <span className="text-xs font-medium text-slate-600 w-8">{p.avance}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, subValue, icon: Icon, color, highlight }: {
  label: string; value: number; subValue: string; icon: any; color: "blue" | "red" | "orange" | "emerald"; highlight?: boolean;
}) {
  const styles = {
    blue: { text: "text-blue-600", iconBg: "bg-blue-100" },
    red: { text: "text-red-600", iconBg: "bg-red-100" },
    orange: { text: "text-orange-600", iconBg: "bg-orange-100" },
    emerald: { text: "text-emerald-600", iconBg: "bg-emerald-100" },
  }[color];
  return (
    <Card className={cn("transition-all hover:shadow-md", highlight && "ring-2 ring-red-200 shadow-md")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
            <p className={cn("text-xs mt-1", styles.text)}>{subValue}</p>
          </div>
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", styles.iconBg)}>
            <Icon className={cn("h-5 w-5", styles.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

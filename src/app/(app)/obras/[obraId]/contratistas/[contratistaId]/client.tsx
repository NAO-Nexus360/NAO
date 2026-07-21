"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Briefcase, Mail, Phone, ListTodo, CheckCircle2, AlertOctagon, PlayCircle,
  Clock, Eye, TrendingUp, Calendar, Users, Hash, Image as ImageIcon, MessageSquare, Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PrioridadBadge, EstatusBadge, AreaBadge, AREA_LABEL } from "@/components/common/badges";
import { EstadoMetaBadge } from "@/components/common/estado-meta-badge";
import { calcularEstadoMeta, diasDiferencia } from "@/lib/meta-helpers";
import { formatDate, isOverdue, cn } from "@/lib/utils";
import { PendienteDetailDialog } from "@/components/forms/pendiente-detail-dialog";
import { ProgramaObraSection } from "@/components/programa-obra-section";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const AREA_HEX: Record<string, string> = {
  ESTRUCTURA: "#78716c", OBRA_CIVIL: "#d97706", OBRA_BLANCA: "#71717a",
  INSTALACIONES: "#06b6d4", ACABADOS: "#ec4899", PROYECTO: "#6366f1",
  ADMINISTRATIVO: "#64748b", VENTA: "#10b981", POSTVENTA: "#14b8a6",
};

export function ContratistaDetailClient({
  obra, contratista, pendientes, metas, programas, user, stats,
}: {
  obra: any; contratista: any; pendientes: any[]; metas: any[]; programas: any[]; user: any; stats: any;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPendiente, setDetailPendiente] = useState<any | null>(null);

  // Datos para gráfica de cumplimiento (donut)
  const cumplimientoData = [
    { name: "Completadas", value: stats.completados, fill: "#10b981" },
    { name: "Pendientes", value: stats.enPendiente, fill: "#94a3b8" },
    { name: "En progreso", value: stats.enProgreso, fill: "#3b82f6" },
    { name: "En revisión", value: stats.enRevision, fill: "#a855f7" },
  ].filter((d) => d.value > 0);

  // Datos para gráfica por área (barras)
  const areaData = Object.entries(stats.porArea).map(([area, value]) => ({
    name: AREA_LABEL[area] || area,
    value: value as number,
    fill: AREA_HEX[area] || "#64748b",
  })).sort((a, b) => b.value - a.value);

  function openDetail(p: any) { setDetailPendiente(p); setDetailOpen(true); }

  return (
    <div className="space-y-6">
      {/* Botón regreso */}
      <Link href={`/obras/${obra.id}/dashboard`} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Volver al dashboard de {obra.nombre}
      </Link>

      {/* Header del contratista */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shrink-0 shadow-md">
                <Briefcase className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{contratista.nombre}</h1>
                {contratista.empresa && <p className="text-sm text-slate-600 mt-0.5">{contratista.empresa}</p>}
                {contratista.rfc && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <Hash className="h-3 w-3" /> RFC: {contratista.rfc}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600">
                  {contratista.email && (
                    <a href={`mailto:${contratista.email}`} className="flex items-center gap-1.5 hover:text-blue-600">
                      <Mail className="h-3.5 w-3.5" /> {contratista.email}
                    </a>
                  )}
                  {contratista.telefono && (
                    <a href={`tel:${contratista.telefono}`} className="flex items-center gap-1.5 hover:text-blue-600">
                      <Phone className="h-3.5 w-3.5" /> {contratista.telefono}
                    </a>
                  )}
                </div>
              </div>
            </div>
            <Badge variant="info" className="text-xs">{obra.nombre}</Badge>
          </div>

          {contratista.usuarios?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                <Users className="h-3 w-3 inline mr-1" /> Usuarios del contratista
              </p>
              <div className="flex flex-wrap gap-2">
                {contratista.usuarios.map((u: any) => (
                  <Badge key={u.id} variant="secondary" className="text-xs">{u.name} · {u.email}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <KpiCard label="Total" value={stats.total} icon={ListTodo} color="slate" />
        <KpiCard label="Pendientes" value={stats.enPendiente} icon={Clock} color="slate" />
        <KpiCard label="En progreso" value={stats.enProgreso} icon={PlayCircle} color="blue" />
        <KpiCard label="Completadas" value={stats.completados} icon={CheckCircle2} color="emerald" />
        <KpiCard label="Vencidas" value={stats.vencidos} icon={AlertOctagon} color="red" highlight={stats.vencidos > 0} />
        <KpiCard label="Cumplimiento" value={`${stats.cumplimiento}%`} icon={TrendingUp} color="emerald" />
      </div>

      {/* Métricas avanzadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tiempo promedio en completar</p>
                {stats.tiempoPromedio !== null ? (
                  <>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.tiempoPromedio} <span className="text-base font-normal text-slate-500">días</span></p>
                    <p className="text-xs text-slate-500 mt-1">desde inicio hasta cierre</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 mt-2 italic">Sin tareas completadas todavía</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Entregadas a tiempo</p>
                {stats.pctATiempo !== null ? (
                  <>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.pctATiempo}%</p>
                    <Progress value={stats.pctATiempo} className="h-1.5 mt-2"
                      indicatorClassName={cn(stats.pctATiempo >= 80 ? "bg-emerald-500" : stats.pctATiempo >= 50 ? "bg-amber-500" : "bg-red-500")} />
                    <p className="text-xs text-slate-500 mt-1.5">de las tareas completadas</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 mt-2 italic">Sin tareas completadas todavía</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2 gráficas lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut de cumplimiento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución de tareas</CardTitle>
            <p className="text-xs text-slate-500">Cómo se distribuyen las tareas por estatus</p>
          </CardHeader>
          <CardContent>
            {cumplimientoData.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Sin tareas aún</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={cumplimientoData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3} label={(d: any) => d.value}>
                      {cumplimientoData.map((d: any, i: number) => (<Cell key={i} fill={d.fill} />))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1.5 mt-2 text-xs">
                  {cumplimientoData.map((d: any, i: number) => (
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

        {/* Barras por área */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tareas por área</CardTitle>
            <p className="text-xs text-slate-500">En qué áreas se concentra el trabajo del contratista</p>
          </CardHeader>
          <CardContent>
            {areaData.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Sin tareas aún</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={areaData} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} cursor={{ fill: "#f1f5f9" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {areaData.map((d: any, i: number) => (<Cell key={i} fill={d.fill} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Programa de obra (Excel/PDF) */}
      <ProgramaObraSection
        programas={programas}
        obraId={obra.id}
        contratistaId={contratista.id}
        user={user}
      />

      {/* Metas del contratista (programa de obra) */}
      {metas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-600" />
              Metas del programa de obra
            </CardTitle>
            <p className="text-xs text-slate-500">{metas.length} {metas.length === 1 ? "meta comprometida" : "metas comprometidas"}</p>
          </CardHeader>
          <CardContent className="p-0">
            {/* ====== VISTA MÓVIL ====== */}
            <div className="lg:hidden divide-y divide-slate-100">
              {metas.map((m) => {
                const estado = calcularEstadoMeta(m);
                const dif = diasDiferencia(m.fechaFinPlaneada, m.fechaReal);
                return (
                  <div key={m.id} className={cn("p-4",
                    estado === "VENCIDA" && "bg-red-50/40",
                    estado === "CUMPLIDA_TARDE" && "bg-amber-50/30")}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-400 pt-0.5">#{m.folio}</span>
                      <EstadoMetaBadge value={estado} />
                    </div>
                    <p className="font-medium text-sm text-slate-900 mt-1">{m.nombre}</p>
                    {m.notas && <p className="text-xs text-slate-500 mt-0.5 italic line-clamp-1">{m.notas}</p>}
                    <div className="mt-2 text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
                      <span>{formatDate(m.fechaInicioPlaneada)}</span>
                      <span className="text-slate-400">→</span>
                      <span>{formatDate(m.fechaFinPlaneada)}</span>
                      {m.fechaReal && (
                        <span className={cn("ml-1 font-medium",
                          dif !== null && dif > 0 ? "text-red-600" : dif !== null && dif < 0 ? "text-emerald-600" : "text-slate-500")}>
                          · Real: {formatDate(m.fechaReal)}{dif !== null && dif !== 0 && ` (${dif > 0 ? `${dif}d tarde` : `${Math.abs(dif)}d antes`})`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ====== VISTA ESCRITORIO ====== */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    <TableHead className="min-w-[200px]">Meta</TableHead>
                    <TableHead>Inicio planeado</TableHead>
                    <TableHead>Fin planeado</TableHead>
                    <TableHead>Fecha real</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metas.map((m) => {
                    const estado = calcularEstadoMeta(m);
                    const dif = diasDiferencia(m.fechaFinPlaneada, m.fechaReal);
                    return (
                      <TableRow key={m.id} className={cn(
                        estado === "VENCIDA" && "bg-red-50/40",
                        estado === "CUMPLIDA_TARDE" && "bg-amber-50/30",
                      )}>
                        <TableCell className="font-mono text-xs text-slate-500">#{m.folio}</TableCell>
                        <TableCell>
                          <p className="font-medium text-sm text-slate-900">{m.nombre}</p>
                          {m.notas && <p className="text-xs text-slate-500 mt-0.5 italic line-clamp-1">{m.notas}</p>}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(m.fechaInicioPlaneada)}</TableCell>
                        <TableCell className="text-sm">{formatDate(m.fechaFinPlaneada)}</TableCell>
                        <TableCell>
                          {m.fechaReal ? (
                            <div>
                              <span className="text-sm">{formatDate(m.fechaReal)}</span>
                              {dif !== null && (
                                <div className={cn(
                                  "text-[10px] font-medium",
                                  dif > 0 ? "text-red-600" : dif < 0 ? "text-emerald-600" : "text-slate-500"
                                )}>
                                  {dif > 0 ? `${dif}d tarde` : dif < 0 ? `${Math.abs(dif)}d adelantado` : "A tiempo"}
                                </div>
                              )}
                            </div>
                          ) : (<span className="text-sm text-slate-400">—</span>)}
                        </TableCell>
                        <TableCell><EstadoMetaBadge value={estado} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla con todos sus pendientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de pendientes en {obra.nombre}</CardTitle>
          <p className="text-xs text-slate-500">{pendientes.length} {pendientes.length === 1 ? "pendiente" : "pendientes"} en total</p>
        </CardHeader>
        <CardContent className="p-0">
          {/* ====== VISTA MÓVIL ====== */}
          <div className="lg:hidden divide-y divide-slate-100">
            {pendientes.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-12 px-4">Este contratista aún no tiene pendientes en {obra.nombre}</p>
            ) : (
              pendientes.map((p) => {
                const overdue = isOverdue(p.fechaEntrega, p.estatus);
                return (
                  <div key={p.id} onClick={() => openDetail(p)} className={cn("p-4 active:bg-slate-50", overdue && "bg-red-50/40")}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-400 pt-0.5">#{p.folio}</span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <PrioridadBadge value={p.prioridad} />
                        <EstatusBadge value={p.estatus} />
                      </div>
                    </div>
                    <p className="font-medium text-sm text-slate-900 mt-1.5">{p.tarea}</p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-slate-500">
                      <AreaBadge value={p.area} />
                      {p.responsable?.name && <span>· {p.responsable.name}</span>}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{p.fechaInicio ? formatDate(p.fechaInicio) : "—"}</span>
                      <span className="text-slate-400">→</span>
                      <span className={cn(overdue && "text-red-600 font-semibold")}>{formatDate(p.fechaEntrega)}</span>
                      {overdue && <span className="text-[10px] text-red-600 font-bold ml-1">VENCIDO</span>}
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <Progress value={p.avance} className="h-1.5 flex-1"
                        indicatorClassName={cn(p.avance === 100 ? "bg-emerald-500" : p.avance >= 60 ? "bg-blue-500" : "bg-amber-500")} />
                      <span className="text-xs font-semibold w-9 text-right">{p.avance}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ====== VISTA ESCRITORIO ====== */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">#</TableHead>
                  <TableHead className="min-w-[260px]">Tarea</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead className="w-36">% Avance</TableHead>
                  <TableHead>Adj.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-sm text-slate-500 py-12">
                      Este contratista aún no tiene pendientes en {obra.nombre}
                    </TableCell>
                  </TableRow>
                ) : (
                  pendientes.map((p) => {
                    const overdue = isOverdue(p.fechaEntrega, p.estatus);
                    return (
                      <TableRow key={p.id} onClick={() => openDetail(p)} className={cn(overdue && "bg-red-50/40", "cursor-pointer")}>
                        <TableCell className="font-mono text-xs text-slate-500">#{p.folio}</TableCell>
                        <TableCell>
                          <p className="font-medium text-sm text-slate-900 line-clamp-2 max-w-md">{p.tarea}</p>
                        </TableCell>
                        <TableCell><AreaBadge value={p.area} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {p.fechaInicio ? formatDate(p.fechaInicio) : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span className={cn(overdue && "text-red-600 font-semibold")}>{formatDate(p.fechaEntrega)}</span>
                          </div>
                          {overdue && <span className="text-[10px] text-red-600 font-bold">VENCIDO</span>}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">{p.responsable?.name || "—"}</TableCell>
                        <TableCell><PrioridadBadge value={p.prioridad} /></TableCell>
                        <TableCell><EstatusBadge value={p.estatus} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={p.avance} className="h-1.5"
                              indicatorClassName={cn(p.avance === 100 ? "bg-emerald-500" : p.avance >= 60 ? "bg-blue-500" : "bg-amber-500")} />
                            <span className="text-xs font-semibold w-8 text-right">{p.avance}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {p._count?.evidencias > 0 && <span className="inline-flex items-center gap-0.5 font-medium text-slate-700"><ImageIcon className="h-3 w-3" /> {p._count.evidencias}</span>}
                            {p._count?.comentarios > 0 && <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" /> {p._count.comentarios}</span>}
                            {!p._count?.evidencias && !p._count?.comentarios && <span>—</span>}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PendienteDetailDialog pendiente={detailPendiente} open={detailOpen} onOpenChange={setDetailOpen} user={user} />
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, highlight }: {
  label: string; value: number | string; icon: any;
  color: "blue" | "red" | "emerald" | "slate"; highlight?: boolean;
}) {
  const styles = {
    blue: { text: "text-blue-600", iconBg: "bg-blue-100" },
    red: { text: "text-red-600", iconBg: "bg-red-100" },
    emerald: { text: "text-emerald-600", iconBg: "bg-emerald-100" },
    slate: { text: "text-slate-600", iconBg: "bg-slate-100" },
  }[color];
  return (
    <Card className={cn("transition-all hover:shadow-md", highlight && "ring-2 ring-red-200 shadow-md")}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", styles.iconBg)}>
            <Icon className={cn("h-4 w-4", styles.text)} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider leading-tight">{label}</p>
            <p className="text-xl font-bold text-slate-900 leading-tight">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

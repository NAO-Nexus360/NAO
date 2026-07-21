"use client";
import { useMemo, useState } from "react";
import { Target, Plus, Calendar, Pencil, Trash2, Search, CheckCircle2, Briefcase, Image as ImageIcon, Eye } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EstadoMetaBadge } from "@/components/common/estado-meta-badge";
import { calcularEstadoMeta, diasDiferencia } from "@/lib/meta-helpers";
import { formatDate, cn } from "@/lib/utils";
import { MetaDialog } from "@/components/forms/meta-dialog";
import { MetaDetailDialog } from "@/components/forms/meta-detail-dialog";

export function MetasClient({ obra, user, initial }: { obra: any; user: any; initial: any }) {
  const [metas, setMetas] = useState<any[]>(initial.metas);
  const [q, setQ] = useState("");
  const [contratistaFiltro, setContratistaFiltro] = useState("TODOS");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMeta, setDetailMeta] = useState<any | null>(null);

  const isReadonly = user.role === "CONTRATISTA";
  const isSupervisor = user.role === "SUPERVISOR";
  const canEdit = user.role === "SUPERVISOR" || user.role === "RESIDENTE";

  // Enriquecer cada meta con su estado calculado
  const metasConEstado = useMemo(() => {
    return metas.map((m) => ({ ...m, estado: calcularEstadoMeta(m) }));
  }, [metas]);

  const filtered = useMemo(() => {
    return metasConEstado.filter((m) => {
      if (q && !m.nombre.toLowerCase().includes(q.toLowerCase())) return false;
      if (contratistaFiltro !== "TODOS" && m.contratistaId !== contratistaFiltro) return false;
      if (estadoFiltro !== "TODOS" && m.estado !== estadoFiltro) return false;
      return true;
    });
  }, [metasConEstado, q, contratistaFiltro, estadoFiltro]);

  // Contadores por estado
  const counts = useMemo(() => {
    const c = { VENCIDA: 0, EN_CURSO: 0, PROXIMA: 0, CUMPLIDA_A_TIEMPO: 0, CUMPLIDA_TARDE: 0 };
    metasConEstado.forEach((m) => { c[m.estado as keyof typeof c]++; });
    return c;
  }, [metasConEstado]);

  async function handleSave(data: any) {
    try {
      const payload = { ...data, obraId: obra.id };
      if (editing) {
        const res = await fetch(`/api/metas/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        const updated = await res.json();
        setMetas((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        toast.success("Meta actualizada");
      } else {
        const res = await fetch("/api/metas", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        const created = await res.json();
        setMetas((prev) => [...prev, created]);
        toast.success("Meta creada");
      }
      setDialogOpen(false); setEditing(null);
    } catch (e: any) { toast.error(e.message || "Error"); }
  }

  async function marcarCumplida(meta: any) {
    const fechaReal = new Date().toISOString().split("T")[0];
    try {
      const res = await fetch(`/api/metas/${meta.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fechaReal }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const updated = await res.json();
      setMetas((prev) => prev.map((m) => (m.id === meta.id ? { ...m, ...updated } : m)));
      toast.success("Meta marcada como cumplida hoy");
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta meta?")) return;
    try {
      const res = await fetch(`/api/metas/${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      setMetas((prev) => prev.filter((m) => m.id !== id));
      toast.success("Meta eliminada");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Metas</h1>
          <p className="text-sm text-slate-500 mt-1">
            {obra.nombre} · {metas.length} {metas.length === 1 ? "meta" : "metas"} del programa de obra
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Nueva meta
          </Button>
        )}
      </div>

      {isReadonly && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
          🔍 Modo solo lectura. Ves las metas comprometidas de tu empresa.
        </div>
      )}

      {/* Resumen rápido por estado */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <ResumenCard label="Vencidas" value={counts.VENCIDA} color="red" highlight={counts.VENCIDA > 0} />
        <ResumenCard label="En curso" value={counts.EN_CURSO} color="blue" />
        <ResumenCard label="Próximas" value={counts.PROXIMA} color="slate" />
        <ResumenCard label="A tiempo" value={counts.CUMPLIDA_A_TIEMPO} color="emerald" />
        <ResumenCard label="Cumplidas tarde" value={counts.CUMPLIDA_TARDE} color="amber" />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar meta..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            {!isReadonly && (
              <Select value={contratistaFiltro} onValueChange={setContratistaFiltro}>
                <SelectTrigger className="w-full lg:w-56"><SelectValue placeholder="Contratista" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los contratistas</SelectItem>
                  {initial.contratistas.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
              <SelectTrigger className="w-full lg:w-48"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los estados</SelectItem>
                <SelectItem value="VENCIDA">Vencidas</SelectItem>
                <SelectItem value="EN_CURSO">En curso</SelectItem>
                <SelectItem value="PROXIMA">Próximas</SelectItem>
                <SelectItem value="CUMPLIDA_A_TIEMPO">A tiempo</SelectItem>
                <SelectItem value="CUMPLIDA_TARDE">Cumplidas tarde</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Target className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">
                {metas.length === 0 ? "Aún no hay metas en esta obra" : "Sin metas que coincidan con los filtros"}
              </p>
              {metas.length === 0 && canEdit && (
                <p className="text-sm text-slate-400 mt-1">Captura las metas clave del programa de obra de cada contratista</p>
              )}
            </div>
          ) : (
            <>
            {/* ====== VISTA MÓVIL: tarjetas ====== */}
            <div className="lg:hidden divide-y divide-slate-100">
              {filtered.map((m) => {
                const dif = diasDiferencia(m.fechaFinPlaneada, m.fechaReal);
                return (
                  <div key={m.id} onClick={() => { setDetailMeta(m); setDetailOpen(true); }}
                    className={cn("p-4 active:bg-slate-50",
                      m.estado === "VENCIDA" && "bg-red-50/40",
                      m.estado === "CUMPLIDA_TARDE" && "bg-amber-50/30")}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-400 pt-0.5">#{m.folio}</span>
                      <EstadoMetaBadge value={m.estado} />
                    </div>
                    <p className="font-medium text-sm text-slate-900 mt-1">{m.nombre}</p>
                    {m.notas && <p className="text-xs text-slate-500 mt-0.5 italic line-clamp-1">{m.notas}</p>}
                    {m.contratista?.nombre && (
                      <p className="text-xs text-slate-600 mt-1.5 inline-flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-slate-400" /> {m.contratista.nombre}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 flex-wrap">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{formatDate(m.fechaInicioPlaneada)}</span>
                      <span className="text-slate-400">→</span>
                      <span>{formatDate(m.fechaFinPlaneada)}</span>
                      {m.fechaReal && (
                        <span className={cn("ml-1 font-medium",
                          dif !== null && dif > 0 ? "text-red-600" : dif !== null && dif < 0 ? "text-emerald-600" : "text-slate-500")}>
                          · Real: {formatDate(m.fechaReal)}{dif !== null && dif !== 0 && ` (${dif > 0 ? `${dif}d tarde` : `${Math.abs(dif)}d antes`})`}
                        </span>
                      )}
                      {m.evidencias?.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-slate-500 ml-1">
                          <ImageIcon className="h-3 w-3" /> {m.evidencias.length}
                        </span>
                      )}
                    </div>
                    {canEdit && (
                      <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {!m.fechaReal && (
                          <Button size="sm" variant="outline"
                            className="h-8 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 flex-1"
                            onClick={() => marcarCumplida(m)}>
                            <CheckCircle2 className="h-3 w-3" /> Cumplida hoy
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(m); setDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {isSupervisor && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDelete(m.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ====== VISTA ESCRITORIO: tabla ====== */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    <TableHead className="min-w-[240px]">Meta</TableHead>
                    <TableHead>Contratista</TableHead>
                    <TableHead>Inicio planeado</TableHead>
                    <TableHead>Fin planeado</TableHead>
                    <TableHead>Fecha real</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fotos</TableHead>
                    <TableHead className="text-right pr-4">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => {
                    const dif = diasDiferencia(m.fechaFinPlaneada, m.fechaReal);
                    return (
                      <TableRow key={m.id} onClick={() => { setDetailMeta(m); setDetailOpen(true); }} className={cn(
                        m.estado === "VENCIDA" && "bg-red-50/40",
                        m.estado === "CUMPLIDA_TARDE" && "bg-amber-50/30",
                        "cursor-pointer",
                      )}>
                        <TableCell className="font-mono text-xs text-slate-500">#{m.folio}</TableCell>
                        <TableCell>
                          <p className="font-medium text-sm text-slate-900">{m.nombre}</p>
                          {m.notas && <p className="text-xs text-slate-500 mt-0.5 italic line-clamp-1">{m.notas}</p>}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">
                          <span className="inline-flex items-center gap-1.5">
                            <Briefcase className="h-3 w-3 text-slate-400" />
                            {m.contratista?.nombre || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {formatDate(m.fechaInicioPlaneada)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {formatDate(m.fechaFinPlaneada)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {m.fechaReal ? (
                            <div>
                              <div className="flex items-center gap-1.5 text-sm">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {formatDate(m.fechaReal)}
                              </div>
                              {dif !== null && (
                                <span className={cn(
                                  "text-[10px] font-medium",
                                  dif > 0 ? "text-red-600" : dif < 0 ? "text-emerald-600" : "text-slate-500"
                                )}>
                                  {dif > 0 ? `${dif}d tarde` : dif < 0 ? `${Math.abs(dif)}d adelantado` : "A tiempo"}
                                </span>
                              )}
                            </div>
                          ) : (<span className="text-sm text-slate-400">—</span>)}
                        </TableCell>
                        <TableCell><EstadoMetaBadge value={m.estado} /></TableCell>
                        <TableCell>
                          {m.evidencias?.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
                              <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                              {m.evidencias.length}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8"
                              onClick={() => { setDetailMeta(m); setDetailOpen(true); }} title="Ver detalle">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {canEdit && !m.fechaReal && (
                              <Button size="sm" variant="outline"
                                className="h-7 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                                onClick={() => marcarCumplida(m)}>
                                <CheckCircle2 className="h-3 w-3" /> Cumplida hoy
                              </Button>
                            )}
                            {canEdit && (
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(m); setDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {isSupervisor && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(m.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <MetaDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          contratistas={initial.contratistas}
          meta={editing}
          onSave={handleSave}
        />
      )}

      <MetaDetailDialog
        meta={detailMeta}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        user={user}
      />
    </div>
  );
}

function ResumenCard({ label, value, color, highlight }: {
  label: string; value: number; color: "red" | "blue" | "slate" | "emerald" | "amber"; highlight?: boolean;
}) {
  const cls = {
    red: { text: "text-red-600", bg: "bg-red-50" },
    blue: { text: "text-blue-600", bg: "bg-blue-50" },
    slate: { text: "text-slate-600", bg: "bg-slate-50" },
    emerald: { text: "text-emerald-600", bg: "bg-emerald-50" },
    amber: { text: "text-amber-600", bg: "bg-amber-50" },
  }[color];
  return (
    <Card className={cn(highlight && "ring-2 ring-red-200")}>
      <CardContent className={cn("p-4", cls.bg)}>
        <p className={cn("text-xs font-medium uppercase tracking-wider", cls.text)}>{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

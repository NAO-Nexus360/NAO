"use client";
import { useMemo, useState } from "react";
import { Search, Plus, Filter, Calendar, MessageSquare, Image as ImageIcon, Trash2, Pencil, CheckCircle2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PrioridadBadge, EstatusBadge, AreaBadge, AREAS_LIST, AREA_LABEL } from "@/components/common/badges";
import { formatDate, isOverdue, diasRestantes, cn } from "@/lib/utils";
import { PendienteDialog } from "@/components/forms/pendiente-dialog";
import { PendienteDetailDialog } from "@/components/forms/pendiente-detail-dialog";

const ESTATUS = ["TODOS", "PENDIENTE", "EN_PROGRESO", "EN_REVISION", "COMPLETADO", "CANCELADO"];
const PRIORIDADES = ["TODAS", "CRITICA", "ALTA", "MEDIA", "BAJA"];
const RANK: Record<string, number> = { CRITICA: 4, ALTA: 3, MEDIA: 2, BAJA: 1 };

export function PendientesClient({ obra, user, initial }: { obra: any; user: any; initial: any }) {
  const [pendientes, setPendientes] = useState<any[]>(initial.pendientes);
  const [q, setQ] = useState("");
  const [area, setArea] = useState("TODAS");
  const [estatus, setEstatus] = useState("TODOS");
  const [prioridad, setPrioridad] = useState("TODAS");
  const [contratistaFiltro, setContratistaFiltro] = useState("TODOS");
  const [soloVencidos, setSoloVencidos] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPendiente, setDetailPendiente] = useState<any | null>(null);

  const isSupervisor = user.role === "SUPERVISOR";
  const isReadonly = user.role === "CONTRATISTA";
  const canEdit = user.role === "SUPERVISOR" || user.role === "RESIDENTE";

  const filtered = useMemo(() => {
    return pendientes
      .filter((p) => {
        if (q && !p.tarea.toLowerCase().includes(q.toLowerCase())) return false;
        if (area !== "TODAS" && p.area !== area) return false;
        if (estatus !== "TODOS" && p.estatus !== estatus) return false;
        if (prioridad !== "TODAS" && p.prioridad !== prioridad) return false;
        if (contratistaFiltro === "SIN_CONTRATISTA" && p.contratistaId) return false;
        if (contratistaFiltro !== "TODOS" && contratistaFiltro !== "SIN_CONTRATISTA" && p.contratistaId !== contratistaFiltro) return false;
        if (soloVencidos && !isOverdue(p.fechaEntrega, p.estatus)) return false;
        return true;
      })
      .sort((a, b) => {
        const r = (RANK[b.prioridad] || 0) - (RANK[a.prioridad] || 0);
        if (r !== 0) return r;
        return new Date(a.fechaEntrega).getTime() - new Date(b.fechaEntrega).getTime();
      });
  }, [pendientes, q, area, estatus, prioridad, contratistaFiltro, soloVencidos]);

  const vencidosCount = pendientes.filter((p) => isOverdue(p.fechaEntrega, p.estatus)).length;

  async function handleSave(data: any) {
    try {
      const payload = { ...data, obraId: obra.id };
      if (editing) {
        const res = await fetch(`/api/pendientes/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        const updated = await res.json();
        setPendientes((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
        toast.success("Pendiente actualizado");
        setDialogOpen(false); setEditing(null);
        return updated;
      } else {
        const res = await fetch("/api/pendientes", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        const created = await res.json();
        setPendientes((prev) => [{ ...created, evidencias: [] }, ...prev]);
        toast.success("Pendiente creado");
        setDialogOpen(false); setEditing(null);
        return created;
      }
    } catch (e: any) { toast.error(e.message || "Error"); }
  }

  async function quickUpdate(id: string, patch: any) {
    try {
      const res = await fetch(`/api/pendientes/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const updated = await res.json();
      setPendientes((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    } catch (e: any) { toast.error(e.message || "Error"); }
  }

  async function aprobarCompletado(id: string) {
    if (!confirm("¿Marcar esta tarea como COMPLETADA?")) return;
    await quickUpdate(id, { estatus: "COMPLETADO", avance: 100 });
    toast.success("Tarea aprobada y marcada como Completada");
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este pendiente?")) return;
    try {
      const res = await fetch(`/api/pendientes/${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      setPendientes((prev) => prev.filter((p) => p.id !== id));
      toast.success("Eliminado");
    } catch (e: any) { toast.error(e.message || "Error"); }
  }

  function openDetail(p: any) { setDetailPendiente(p); setDetailOpen(true); }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pendientes</h1>
          <p className="text-sm text-slate-500 mt-1">
            {obra.nombre} · {filtered.length} de {pendientes.length}
            {vencidosCount > 0 && <span className="ml-2 text-red-600 font-medium">· {vencidosCount} vencidos</span>}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Nuevo pendiente
          </Button>
        )}
      </div>

      {isReadonly && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
          🔍 Estás en <b>modo solo lectura</b>. Puedes ver tus pendientes y abrir el detalle con fotos.
        </div>
      )}
      {user.role === "RESIDENTE" && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          💡 Puedes crear/editar pendientes y mover el avance hasta 100%, pero <b>solo un supervisor puede marcar Completado</b>.
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar tarea..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Área" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas las áreas</SelectItem>
                {AREAS_LIST.map((a) => (<SelectItem key={a} value={a}>{AREA_LABEL[a]}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={contratistaFiltro} onValueChange={setContratistaFiltro}>
              <SelectTrigger className="w-full lg:w-52"><SelectValue placeholder="Contratista" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los contratistas</SelectItem>
                <SelectItem value="SIN_CONTRATISTA">Sin contratista</SelectItem>
                {initial.contratistas.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={estatus} onValueChange={setEstatus}>
              <SelectTrigger className="w-full lg:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ESTATUS.map((s) => (<SelectItem key={s} value={s}>{s === "TODOS" ? "Todos los estatus" : s.replace("_", " ")}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={prioridad} onValueChange={setPrioridad}>
              <SelectTrigger className="w-full lg:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORIDADES.map((p) => (<SelectItem key={p} value={p}>{p === "TODAS" ? "Todas las prioridades" : p}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button variant={soloVencidos ? "default" : "outline"} onClick={() => setSoloVencidos((v) => !v)} className="w-full lg:w-auto">
              <Filter className="h-4 w-4" /> Vencidos
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">#</TableHead>
                  <TableHead className="min-w-[260px]">Tarea</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead>Contratista</TableHead><TableHead>Responsable</TableHead>
                  <TableHead>Prioridad</TableHead><TableHead>Estatus</TableHead>
                  <TableHead className="w-36">% Avance</TableHead><TableHead>Adj.</TableHead>
                  <TableHead className="text-right pr-4">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center text-sm text-slate-500 py-12">No hay pendientes que coincidan</TableCell></TableRow>
                ) : (
                  filtered.map((p) => {
                    const overdue = isOverdue(p.fechaEntrega, p.estatus);
                    const dias = diasRestantes(p.fechaEntrega);
                    const enRevision = p.estatus === "EN_REVISION";
                    return (
                      <TableRow key={p.id} className={cn(overdue && "bg-red-50/40", enRevision && isSupervisor && "bg-violet-50/40", "cursor-pointer")}
                        onClick={() => openDetail(p)}>
                        <TableCell className="font-mono text-xs text-slate-500">#{p.folio}</TableCell>
                        <TableCell>
                          <p className="font-medium text-sm text-slate-900 line-clamp-2 max-w-md">{p.tarea}</p>
                          {p.observaciones && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-md italic">{p.observaciones}</p>}
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
                          {!overdue && dias >= 0 && dias <= 3 && p.estatus !== "COMPLETADO" && (
                            <span className="text-[10px] text-orange-600 font-medium">{dias === 0 ? "Vence hoy" : `En ${dias} día${dias !== 1 ? "s" : ""}`}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">{p.contratista?.nombre || "—"}</TableCell>
                        <TableCell className="text-sm text-slate-700">{p.responsable?.name || "—"}</TableCell>
                        <TableCell><PrioridadBadge value={p.prioridad} /></TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {canEdit ? (
                            <Select value={p.estatus} onValueChange={(v) => quickUpdate(p.id, { estatus: v })}>
                              <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                                <SelectItem value="EN_PROGRESO">En progreso</SelectItem>
                                <SelectItem value="EN_REVISION">En revisión</SelectItem>
                                {isSupervisor && <SelectItem value="COMPLETADO">Completado</SelectItem>}
                                <SelectItem value="CANCELADO">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (<EstatusBadge value={p.estatus} />)}
                        </TableCell>
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
                        <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openDetail(p)} title="Ver detalle">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {isSupervisor && enRevision && (
                              <Button size="sm" variant="outline" className="h-7 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200" onClick={() => aprobarCompletado(p.id)}>
                                <CheckCircle2 className="h-3 w-3" /> Aprobar
                              </Button>
                            )}
                            {canEdit && (
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(p); setDialogOpen(true); }} title="Editar">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {isSupervisor && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(p.id)} title="Eliminar">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
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

      {canEdit && (
        <PendienteDialog
          open={dialogOpen} onOpenChange={setDialogOpen}
          usuarios={initial.usuarios} contratistas={initial.contratistas}
          pendiente={editing} onSave={handleSave} userRole={user.role}
        />
      )}

      <PendienteDetailDialog
        pendiente={detailPendiente}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        user={user}
      />
    </div>
  );
}

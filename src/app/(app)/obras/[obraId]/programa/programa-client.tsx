"use client";
import { useMemo, useState } from "react";
import { CalendarRange, Plus, Pencil, Trash2, Briefcase, ChevronUp, ChevronDown, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProgramaActividadDialog } from "@/components/forms/programa-actividad-dialog";
import { formatFechaMX, isoMX } from "@/lib/fechas-mx";
import { puedeImportar } from "@/lib/permisos-importar";

export function ProgramaClient({ obra, user, initial }: { obra: any; user: any; initial: any }) {
  const [actividades, setActividades] = useState<any[]>(initial.actividades);
  const [contratistaFiltro, setContratistaFiltro] = useState<string>(
    initial.contratistas[0]?.id ?? "TODOS"
  );
  const [recorrer, setRecorrer] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [importando, setImportando] = useState(false);

  const isReadonly = user.role === "CONTRATISTA";
  const canEdit = user.role === "SUPERVISOR" || user.role === "RESIDENTE";
  const isSupervisor = user.role === "SUPERVISOR";
  const seleccionUnica = contratistaFiltro !== "TODOS";
  // Carga de archivos: solo para la cuenta autorizada y con un contratista seleccionado
  const puedeSubirArchivo = canEdit && seleccionUnica && puedeImportar(user.email);

  const nombreContratista = useMemo(() => {
    const m: Record<string, string> = {};
    initial.contratistas.forEach((c: any) => { m[c.id] = c.nombre; });
    return m;
  }, [initial.contratistas]);

  // Filas visibles: por contratista, en su orden del plan
  const visibles = useMemo(() => {
    return actividades
      .filter((a) => contratistaFiltro === "TODOS" || a.contratistaId === contratistaFiltro)
      .sort((a, b) => {
        const na = nombreContratista[a.contratistaId] || "";
        const nb = nombreContratista[b.contratistaId] || "";
        if (na !== nb) return na.localeCompare(nb, "es-MX");
        return (a.orden ?? 0) - (b.orden ?? 0);
      });
  }, [actividades, contratistaFiltro, nombreContratista]);

  // Reemplaza en el estado el plan completo de un contratista
  function reemplazarPlan(contratistaId: string, plan: any[]) {
    setActividades((prev) => [
      ...prev.filter((a) => a.contratistaId !== contratistaId),
      ...plan.map((a) => ({ ...a, contratistaId })),
    ]);
  }

  async function recargarPlan(contratistaId: string) {
    const res = await fetch(`/api/programa-actividades?obraId=${obra.id}&contratistaId=${contratistaId}`);
    if (!res.ok) throw new Error("No se pudo recargar el programa");
    reemplazarPlan(contratistaId, await res.json());
  }

  async function guardarFecha(a: any, nuevaFecha: string) {
    if (!nuevaFecha || nuevaFecha === isoMX(a.fecha)) return;
    try {
      const res = await fetch(`/api/programa-actividades/${a.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: nuevaFecha, recorrer }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      reemplazarPlan(a.contratistaId, await res.json());
      toast.success(recorrer ? "Fecha cambiada y plan recorrido" : "Fecha cambiada");
    } catch (e: any) { toast.error(e.message); }
  }

  async function mover(contratistaId: string, index: number, dir: -1 | 1) {
    const plan = actividades
      .filter((a) => a.contratistaId === contratistaId)
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    const destino = index + dir;
    if (destino < 0 || destino >= plan.length) return;
    const ids = plan.map((a) => a.id);
    [ids[index], ids[destino]] = [ids[destino], ids[index]];
    try {
      const res = await fetch("/api/programa-actividades/orden", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ obraId: obra.id, contratistaId, ids }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      reemplazarPlan(contratistaId, await res.json());
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleSave(data: any) {
    try {
      if (editing) {
        const res = await fetch(`/api/programa-actividades/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        reemplazarPlan(editing.contratistaId, await res.json());
        toast.success("Actividad actualizada");
      } else {
        const res = await fetch("/api/programa-actividades", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, obraId: obra.id }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        const creadas = await res.json();
        await recargarPlan(data.contratistaId);
        toast.success(`${creadas.length} ${creadas.length === 1 ? "actividad agregada" : "actividades agregadas"}`);
      }
      setDialogOpen(false); setEditing(null);
    } catch (e: any) { toast.error(e.message || "Error"); }
  }

  async function importarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setImportando(true);
    try {
      const fd = new FormData();
      fd.append("file", archivo);
      fd.append("obraId", obra.id);
      fd.append("contratistaId", contratistaFiltro);
      const res = await fetch("/api/programa-actividades/importar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo importar el archivo");
      await recargarPlan(contratistaFiltro);
      const partes = [`${data.agregadas} ${data.agregadas === 1 ? "actividad agregada" : "actividades agregadas"}`];
      if (data.duplicadas) partes.push(`${data.duplicadas} ya existían`);
      if (data.ignoradas) partes.push(`${data.ignoradas} omitidas por falta de descripción`);
      toast.success(partes.join(" · "));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImportando(false);
    }
  }

  async function handleDelete(a: any) {
    if (!confirm("¿Eliminar esta actividad del programa?")) return;
    try {
      const res = await fetch(`/api/programa-actividades/${a.id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      await recargarPlan(a.contratistaId);
      toast.success("Actividad eliminada");
    } catch (e: any) { toast.error(e.message); }
  }

  const numeroEnPlan = (a: any) =>
    actividades
      .filter((x) => x.contratistaId === a.contratistaId)
      .sort((x, y) => (x.orden ?? 0) - (y.orden ?? 0))
      .findIndex((x) => x.id === a.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Programa de obra</h1>
          <p className="text-sm text-slate-500 mt-1">
            {obra.nombre} · {visibles.length} {visibles.length === 1 ? "actividad" : "actividades"} programadas
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {puedeSubirArchivo && (
              <label className={`inline-flex ${importando ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
                <span className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {importando ? "Analizando archivo..." : "Subir archivo"}
                </span>
                <input type="file" className="hidden" disabled={importando}
                  accept=".xlsx,.xls,.csv,.pdf,image/*"
                  onChange={importarArchivo} />
              </label>
            )}
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> Capturar actividades
            </Button>
          </div>
        )}
      </div>

      {isReadonly && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
          🔍 Modo solo lectura. Ves las actividades programadas de tu empresa.
        </div>
      )}

      {!isReadonly && (
        <Card>
          <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
            <Select value={contratistaFiltro} onValueChange={setContratistaFiltro}>
              <SelectTrigger className="w-full lg:w-72"><SelectValue placeholder="Contratista" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los contratistas</SelectItem>
                {initial.contratistas.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canEdit && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={recorrer}
                  onChange={(e) => setRecorrer(e.target.checked)} />
                Al cambiar una fecha, recorrer las actividades siguientes (días hábiles de México)
              </label>
            )}
          </CardContent>
        </Card>
      )}

      {canEdit && seleccionUnica && (
        <p className="text-xs text-slate-500">
          Usa las flechas para cambiar el orden de las actividades de este contratista. Las fechas se pueden editar directamente en la tabla.
        </p>
      )}
      {canEdit && !seleccionUnica && (
        <p className="text-xs text-slate-500">
          Para reordenar, elige un contratista en el filtro.
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          {visibles.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <CalendarRange className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">
                {actividades.length === 0 ? "Aún no hay actividades en el programa de esta obra" : "Sin actividades para este contratista"}
              </p>
              {actividades.length === 0 && canEdit && (
                <p className="text-sm text-slate-400 mt-1">Captura las actividades planeadas de cada contratista con su fecha</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="min-w-[240px]">Actividad</TableHead>
                    {!seleccionUnica && <TableHead>Contratista</TableHead>}
                    {canEdit && <TableHead className="w-44 text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibles.map((a) => {
                    const idx = numeroEnPlan(a);
                    const total = actividades.filter((x) => x.contratistaId === a.contratistaId).length;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs text-slate-500">{idx + 1}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {canEdit ? (
                            <Input type="date" className="h-8 w-40 text-sm" value={isoMX(a.fecha)} aria-label="Fecha"
                              onChange={(e) => guardarFecha(a, e.target.value)} />
                          ) : formatFechaMX(a.fecha)}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-900">{a.actividad}</TableCell>
                        {!seleccionUnica && (
                          <TableCell className="text-sm text-slate-700">
                            <span className="inline-flex items-center gap-1.5">
                              <Briefcase className="h-3 w-3 text-slate-400" /> {nombreContratista[a.contratistaId]}
                            </span>
                          </TableCell>
                        )}
                        {canEdit && (
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              {seleccionUnica && (
                                <>
                                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Subir"
                                    disabled={idx === 0} onClick={() => mover(a.contratistaId, idx, -1)}>
                                    <ChevronUp className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Bajar"
                                    disabled={idx === total - 1} onClick={() => mover(a.contratistaId, idx, 1)}>
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar texto"
                                onClick={() => { setEditing(a); setDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {isSupervisor && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" title="Eliminar"
                                  onClick={() => handleDelete(a)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <ProgramaActividadDialog
          open={dialogOpen}
          onOpenChange={(b) => { setDialogOpen(b); if (!b) setEditing(null); }}
          contratistas={initial.contratistas}
          actividades={actividades}
          actividad={editing}
          recorrer={recorrer}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

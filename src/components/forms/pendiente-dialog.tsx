"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { AREAS_LIST, AREA_LABEL } from "@/components/common/badges";

type Usuario = { id: string; name: string; role: string };
type Contratista = { id: string; nombre: string; empresa?: string | null };

export function PendienteDialog({
  open, onOpenChange, usuarios, contratistas, pendiente, onSave, userRole,
}: {
  open: boolean; onOpenChange: (b: boolean) => void;
  usuarios: Usuario[]; contratistas: Contratista[];
  pendiente?: any | null;
  onSave: (data: any) => Promise<any>;
  userRole: string;
}) {
  const isSupervisor = userRole === "SUPERVISOR";

  const [form, setForm] = useState({
    tarea: "", descripcion: "", area: "ESTRUCTURA", prioridad: "MEDIA", estatus: "PENDIENTE", avance: 0,
    fechaInicio: "", fechaEntrega: "",
    observaciones: "", contratistaId: "", responsableId: "", supervisorId: "",
  });
  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [nuevasEvidencias, setNuevasEvidencias] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pendiente) {
      setForm({
        tarea: pendiente.tarea || "", descripcion: pendiente.descripcion || "",
        area: pendiente.area || "ESTRUCTURA", prioridad: pendiente.prioridad || "MEDIA",
        estatus: pendiente.estatus || "PENDIENTE", avance: pendiente.avance || 0,
        fechaInicio: pendiente.fechaInicio ? new Date(pendiente.fechaInicio).toISOString().split("T")[0] : "",
        fechaEntrega: pendiente.fechaEntrega ? new Date(pendiente.fechaEntrega).toISOString().split("T")[0] : "",
        observaciones: pendiente.observaciones || "",
        contratistaId: pendiente.contratistaId || "",
        responsableId: pendiente.responsableId || "",
        supervisorId: pendiente.supervisorId || "",
      });
      setEvidencias(pendiente.evidencias || []);
      setNuevasEvidencias([]);
    } else {
      const hoy = new Date();
      const en7 = new Date(); en7.setDate(en7.getDate() + 7);
      setForm({
        tarea: "", descripcion: "", area: "ESTRUCTURA", prioridad: "MEDIA", estatus: "PENDIENTE", avance: 0,
        fechaInicio: hoy.toISOString().split("T")[0],
        fechaEntrega: en7.toISOString().split("T")[0],
        observaciones: "", contratistaId: "", responsableId: "", supervisorId: "",
      });
      setEvidencias([]);
      setNuevasEvidencias([]);
    }
  }, [pendiente, open]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: any[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "pendientes");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) { toast.error("Error subiendo " + file.name); continue; }
        const data = await res.json();
        uploaded.push(data);
      }
      setNuevasEvidencias((prev) => [...prev, ...uploaded]);
      if (uploaded.length) toast.success(`${uploaded.length} archivo(s) subido(s)`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function eliminarEvidenciaExistente(evidenciaId: string) {
    if (!pendiente) return;
    if (!confirm("¿Eliminar esta foto?")) return;
    try {
      const res = await fetch(`/api/pendientes/${pendiente.id}/evidencias?evidenciaId=${evidenciaId}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      setEvidencias((prev) => prev.filter((ev) => ev.id !== evidenciaId));
      toast.success("Foto eliminada");
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tarea || !form.fechaInicio || !form.fechaEntrega) {
      toast.error("Tarea, fecha de inicio y fecha de término son obligatorias");
      return;
    }
    if (new Date(form.fechaInicio) > new Date(form.fechaEntrega)) {
      toast.error("La fecha de inicio no puede ser posterior a la de término");
      return;
    }
    setSaving(true);
    try {
      const result = await onSave({
        ...form,
        avance: Number(form.avance),
        contratistaId: form.contratistaId || null,
        responsableId: form.responsableId || null,
        supervisorId: form.supervisorId || null,
      });

      // Si se creó/actualizó OK, subir evidencias nuevas al pendiente
      const idPendiente = result?.id || pendiente?.id;
      if (idPendiente && nuevasEvidencias.length) {
        await fetch(`/api/pendientes/${idPendiente}/evidencias`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evidencias: nuevasEvidencias }),
        });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{pendiente ? "Editar pendiente" : "Nuevo pendiente"}</DialogTitle>
          <DialogDescription>
            {pendiente ? "Actualiza los datos del pendiente." : "Crea una nueva tarea o pendiente."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tarea">Tarea <span className="text-red-500">*</span></Label>
            <Input id="tarea" value={form.tarea} onChange={(e) => setForm({ ...form, tarea: e.target.value })}
              placeholder="Ej: Colado de losa Nivel 3 zona A" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={form.area} onValueChange={(v) => setForm({ ...form, area: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AREAS_LIST.map((a) => (<SelectItem key={a} value={a}>{AREA_LABEL[a]}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={form.prioridad} onValueChange={(v) => setForm({ ...form, prioridad: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAJA">Baja</SelectItem>
                  <SelectItem value="MEDIA">Media</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="CRITICA">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estatus</Label>
              <Select value={form.estatus} onValueChange={(v) => setForm({ ...form, estatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="EN_PROGRESO">En progreso</SelectItem>
                  <SelectItem value="EN_REVISION">En revisión</SelectItem>
                  {isSupervisor && <SelectItem value="COMPLETADO">Completado</SelectItem>}
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              {!isSupervisor && <p className="text-[11px] text-slate-500">Solo supervisores marcan Completado</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaInicio">Fecha de inicio <span className="text-red-500">*</span></Label>
              <Input id="fechaInicio" type="date" value={form.fechaInicio}
                onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaEntrega">Fecha de término <span className="text-red-500">*</span></Label>
              <Input id="fechaEntrega" type="date" value={form.fechaEntrega}
                onChange={(e) => setForm({ ...form, fechaEntrega: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avance">% Avance: {form.avance}%</Label>
              <input id="avance" type="range" min={0} max={100} step={5} value={form.avance}
                onChange={(e) => setForm({ ...form, avance: Number(e.target.value) })}
                className="w-full accent-slate-900" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Contratista</Label>
              <Select value={form.contratistaId} onValueChange={(v) => setForm({ ...form, contratistaId: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{contratistas.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select value={form.responsableId} onValueChange={(v) => setForm({ ...form, responsableId: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{usuarios.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Supervisor</Label>
              <Select value={form.supervisorId} onValueChange={(v) => setForm({ ...form, supervisorId: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{usuarios.filter((u) => u.role === "SUPERVISOR").map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea id="observaciones" value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })} rows={2} />
          </div>

          {/* Fotos del pendiente */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Fotos y archivos del pendiente
            </Label>

            {/* Existentes (al editar) */}
            {evidencias.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Fotos ya guardadas:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3">
                  {evidencias.map((ev) => (
                    <div key={ev.id} className="relative group rounded-lg border border-slate-200 overflow-hidden">
                      {ev.tipo === "image" || ev.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ev.url} alt="" className="w-full h-24 object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-24 bg-slate-50 text-slate-500">
                          <FileText className="h-6 w-6" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => eliminarEvidenciaExistente(ev.id)}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                        title="Eliminar"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subir nuevas */}
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-4">
              <label className="flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 rounded transition py-3">
                {uploading ? (<Loader2 className="h-5 w-5 text-slate-400 animate-spin mb-1" />) : (<Upload className="h-5 w-5 text-slate-400 mb-1" />)}
                <span className="text-sm text-slate-600">{uploading ? "Subiendo..." : "Subir fotos o PDFs"}</span>
                <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
              {nuevasEvidencias.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {nuevasEvidencias.map((ev, i) => (
                    <div key={i} className="relative group rounded-lg border border-slate-200 overflow-hidden">
                      {ev.tipo === "image" || ev.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ev.url} alt="" className="w-full h-24 object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-24 bg-slate-50 text-slate-500">
                          <FileText className="h-6 w-6" />
                          <span className="text-[10px] mt-1 truncate w-full text-center px-1">{ev.nombre}</span>
                        </div>
                      )}
                      <button type="button"
                        onClick={() => setNuevasEvidencias((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-2">
                Sube fotos del avance, planos, certificados, etc. Se guardan junto a la tarea.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : pendiente ? "Guardar cambios" : "Crear pendiente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

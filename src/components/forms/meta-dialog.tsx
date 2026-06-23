"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Contratista = { id: string; nombre: string; empresa?: string | null };

export function MetaDialog({
  open, onOpenChange, contratistas, meta, onSave,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  contratistas: Contratista[];
  meta?: any | null;
  onSave: (data: any) => Promise<any>;
}) {
  const [form, setForm] = useState({
    contratistaId: "",
    nombre: "",
    notas: "",
    fechaInicioPlaneada: "",
    fechaFinPlaneada: "",
    fechaReal: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (meta) {
      setForm({
        contratistaId: meta.contratistaId || "",
        nombre: meta.nombre || "",
        notas: meta.notas || "",
        fechaInicioPlaneada: meta.fechaInicioPlaneada ? new Date(meta.fechaInicioPlaneada).toISOString().split("T")[0] : "",
        fechaFinPlaneada: meta.fechaFinPlaneada ? new Date(meta.fechaFinPlaneada).toISOString().split("T")[0] : "",
        fechaReal: meta.fechaReal ? new Date(meta.fechaReal).toISOString().split("T")[0] : "",
      });
    } else {
      const hoy = new Date();
      const en30 = new Date(); en30.setDate(en30.getDate() + 30);
      setForm({
        contratistaId: "",
        nombre: "",
        notas: "",
        fechaInicioPlaneada: hoy.toISOString().split("T")[0],
        fechaFinPlaneada: en30.toISOString().split("T")[0],
        fechaReal: "",
      });
    }
  }, [meta, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.contratistaId || !form.nombre || !form.fechaInicioPlaneada || !form.fechaFinPlaneada) {
      toast.error("Contratista, nombre y fechas planeadas son obligatorios");
      return;
    }
    if (new Date(form.fechaInicioPlaneada) > new Date(form.fechaFinPlaneada)) {
      toast.error("La fecha de inicio planeada no puede ser posterior a la fecha de fin planeada");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        contratistaId: form.contratistaId,
        nombre: form.nombre,
        notas: form.notas || undefined,
        fechaInicioPlaneada: form.fechaInicioPlaneada,
        fechaFinPlaneada: form.fechaFinPlaneada,
        fechaReal: form.fechaReal || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{meta ? "Editar meta" : "Nueva meta"}</DialogTitle>
          <DialogDescription>
            {meta
              ? "Actualiza los datos de la meta."
              : "Captura un punto clave del programa de obra de un contratista."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Contratista <span className="text-red-500">*</span></Label>
            <Select value={form.contratistaId} onValueChange={(v) => setForm({ ...form, contratistaId: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona un contratista..." /></SelectTrigger>
              <SelectContent>
                {contratistas.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">
                    Esta obra no tiene contratistas asignados todavía.
                  </div>
                ) : (
                  contratistas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}{c.empresa ? ` — ${c.empresa}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-nombre">Nombre de la meta <span className="text-red-500">*</span></Label>
            <Input
              id="m-nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Terminar cimentación / Iniciar estructura Nivel 1"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Inicio planeado <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.fechaInicioPlaneada}
                onChange={(e) => setForm({ ...form, fechaInicioPlaneada: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Fin planeado <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.fechaFinPlaneada}
                onChange={(e) => setForm({ ...form, fechaFinPlaneada: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Fecha real (cumplida)</Label>
              <Input type="date" value={form.fechaReal}
                onChange={(e) => setForm({ ...form, fechaReal: e.target.value })} />
              <p className="text-[11px] text-slate-500">Déjala vacía si aún no se cumple</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-notas">Notas (opcional)</Label>
            <Textarea
              id="m-notas"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              placeholder="Comentarios o detalles adicionales..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : meta ? "Guardar cambios" : "Crear meta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

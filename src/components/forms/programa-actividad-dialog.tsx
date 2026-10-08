"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { hoyMX, isoMX } from "@/lib/fechas-mx";

type Contratista = { id: string; nombre: string; empresa?: string | null };
type Fila = { fecha: string; actividad: string };

export function ProgramaActividadDialog({
  open, onOpenChange, contratistas, actividades, actividad, recorrer, onSave,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  contratistas: Contratista[];
  actividades: any[]; // todas las actividades de la obra (para elegir la posición)
  actividad?: any | null;
  recorrer: boolean;
  onSave: (data: any) => Promise<any>;
}) {
  const [contratistaId, setContratistaId] = useState("");
  const [posicion, setPosicion] = useState("fin"); // "fin" o índice (string) dentro del plan del contratista
  const [filas, setFilas] = useState<Fila[]>([{ fecha: hoyMX(), actividad: "" }]);
  const [saving, setSaving] = useState(false);
  const editing = !!actividad;

  useEffect(() => {
    if (actividad) {
      setContratistaId(actividad.contratistaId || "");
      setFilas([{ fecha: isoMX(actividad.fecha), actividad: actividad.actividad || "" }]);
    } else {
      setContratistaId("");
      setPosicion("fin");
      setFilas([{ fecha: hoyMX(), actividad: "" }]);
    }
  }, [actividad, open]);

  // Plan del contratista elegido, en su orden actual
  const planDelContratista = actividades
    .filter((a) => a.contratistaId === contratistaId)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  function actualizarFila(i: number, campo: keyof Fila, valor: string) {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing && !contratistaId) {
      toast.error("Selecciona un contratista");
      return;
    }
    if (filas.some((f) => !f.fecha || f.actividad.trim().length < 2)) {
      toast.error("Cada fila necesita fecha y actividad");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await onSave({ fecha: filas[0].fecha, actividad: filas[0].actividad, recorrer });
      } else {
        await onSave({
          contratistaId,
          filas,
          posicion: posicion === "fin" ? undefined : Number(posicion),
        });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar actividad" : "Capturar programa de obra"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Cambia la fecha o el texto de la actividad."
              : "Agrega las actividades planeadas del contratista. Se insertan en la posición que elijas."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <>
              <div className="space-y-2">
                <Label>Contratista <span className="text-red-500">*</span></Label>
                <Select value={contratistaId} onValueChange={(v) => { setContratistaId(v); setPosicion("fin"); }}>
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

              {contratistaId && (
                <div className="space-y-2">
                  <Label>Insertar en el plan</Label>
                  <Select value={posicion} onValueChange={setPosicion}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fin">Al final del plan</SelectItem>
                      {planDelContratista.map((a, i) => (
                        <SelectItem key={a.id} value={String(i)}>
                          Antes de: {a.actividad}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label>{editing ? "Actividad" : "Actividades"} <span className="text-red-500">*</span></Label>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {filas.map((f, i) => (
                <div key={i} className="grid grid-cols-[10rem_1fr_auto] gap-2 items-center">
                  <Input type="date" value={f.fecha} aria-label="Fecha"
                    onChange={(e) => actualizarFila(i, "fecha", e.target.value)} required />
                  <Input value={f.actividad} aria-label="Actividad" placeholder="Ej: Colado piso 1"
                    onChange={(e) => actualizarFila(i, "actividad", e.target.value)} required />
                  {!editing && filas.length > 1 ? (
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-red-600 hover:bg-red-50"
                      title="Quitar fila" onClick={() => setFilas((prev) => prev.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : <span className="w-9" />}
                </div>
              ))}
            </div>
            {!editing && (
              <Button type="button" variant="outline" size="sm"
                onClick={() => setFilas((prev) => [...prev, { fecha: hoyMX(), actividad: "" }])}>
                <Plus className="h-4 w-4" /> Agregar fila
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Guardar cambios" : `Guardar ${filas.length} ${filas.length === 1 ? "actividad" : "actividades"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

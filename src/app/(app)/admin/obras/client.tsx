"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building, Users, Briefcase, ListTodo, Pencil, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

export function AdminObrasClient({ initial }: { initial: any }) {
  const router = useRouter();
  const [obras, setObras] = useState<any[]>(initial.obras);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>({
    nombre: "", direccion: "", fechaInicio: "", fechaFinEstimada: "",
    miembrosIds: [] as string[], contratistasIds: [] as string[],
  });

  function startNew() {
    setEditing(null);
    setForm({ nombre: "", direccion: "", fechaInicio: "", fechaFinEstimada: "", miembrosIds: [], contratistasIds: [] });
    setOpen(true);
  }
  function startEdit(o: any) {
    setEditing(o);
    setForm({
      nombre: o.nombre || "", direccion: o.direccion || "",
      fechaInicio: o.fechaInicio ? new Date(o.fechaInicio).toISOString().split("T")[0] : "",
      fechaFinEstimada: o.fechaFinEstimada ? new Date(o.fechaFinEstimada).toISOString().split("T")[0] : "",
      miembrosIds: o.miembros.map((m: any) => m.user.id),
      contratistasIds: o.contratistas.map((c: any) => c.contratista.id),
    });
    setOpen(true);
  }

  async function save() {
    if (!form.nombre) { toast.error("El nombre es requerido"); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/obras/${editing.id}` : "/api/obras";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success(editing ? "Obra actualizada" : "Obra creada");
      setOpen(false);
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  function toggleId(field: "miembrosIds" | "contratistasIds", id: string) {
    setForm((f: any) => {
      const has = f[field].includes(id);
      return { ...f, [field]: has ? f[field].filter((x: string) => x !== id) : [...f[field], id] };
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Administración de obras</h1>
          <p className="text-sm text-slate-500 mt-1">Crea obras y asigna usuarios + contratistas</p>
        </div>
        <Button onClick={startNew}><Plus className="h-4 w-4" /> Nueva obra</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {obras.map((o) => (
          <Card key={o.id} className="overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Building className="h-5 w-5 text-blue-600" />
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(o)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
              <h3 className="font-semibold text-slate-900 mt-3">{o.nombre}</h3>
              {o.direccion && <p className="text-xs text-slate-500 mt-1 flex items-start gap-1"><MapPin className="h-3 w-3 mt-0.5" /> {o.direccion}</p>}
              {(o.fechaInicio || o.fechaFinEstimada) && (
                <p className="text-xs text-slate-400 mt-1">
                  {o.fechaInicio ? formatDate(o.fechaInicio) : "—"} → {o.fechaFinEstimada ? formatDate(o.fechaFinEstimada) : "—"}
                </p>
              )}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center">
                <div><ListTodo className="h-3 w-3 mx-auto text-slate-400 mb-0.5" /><div className="text-sm font-bold">{o._count.pendientes}</div></div>
                <div><Users className="h-3 w-3 mx-auto text-slate-400 mb-0.5" /><div className="text-sm font-bold">{o._count.miembros}</div></div>
                <div><Briefcase className="h-3 w-3 mx-auto text-slate-400 mb-0.5" /><div className="text-sm font-bold">{o._count.contratistas}</div></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar obra" : "Nueva obra"}</DialogTitle>
            <DialogDescription>Define los datos y el equipo de la obra.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre <span className="text-red-500">*</span></Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Torre Residencial Norte" /></div>
            <div className="space-y-2"><Label>Dirección</Label>
              <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Calle, número, colonia, ciudad" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Fecha de inicio</Label>
                <Input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} /></div>
              <div className="space-y-2"><Label>Fecha estimada de fin</Label>
                <Input type="date" value={form.fechaFinEstimada} onChange={(e) => setForm({ ...form, fechaFinEstimada: e.target.value })} /></div>
            </div>

            <div className="space-y-2">
              <Label>Usuarios asignados ({form.miembrosIds.length})</Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-slate-50">
                {initial.usuarios.map((u: any) => (
                  <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={form.miembrosIds.includes(u.id)} onCheckedChange={() => toggleId("miembrosIds", u.id)} />
                    <span className="text-sm">{u.name} <span className="text-xs text-slate-500">({u.role.replace("_", " ").toLowerCase()})</span></span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Contratistas asignados ({form.contratistasIds.length})</Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-slate-50">
                {initial.contratistas.map((c: any) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={form.contratistasIds.includes(c.id)} onCheckedChange={() => toggleId("contratistasIds", c.id)} />
                    <span className="text-sm">{c.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Guardar cambios" : "Crear obra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

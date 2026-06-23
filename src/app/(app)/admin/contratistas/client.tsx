"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Briefcase, Mail, Phone, Loader2, ListTodo, Building } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function AdminContratistasClient({ initial }: { initial: any }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", empresa: "", rfc: "", telefono: "", email: "" });

  async function create() {
    if (!form.nombre) { toast.error("Nombre requerido"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/contratistas", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success("Contratista agregado");
      setForm({ nombre: "", empresa: "", rfc: "", telefono: "", email: "" });
      setOpen(false);
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contratistas</h1>
          <p className="text-sm text-slate-500 mt-1">Empresas contratistas registradas</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuevo contratista</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {initial.contratistas.map((c: any) => (
          <Card key={c.id}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Briefcase className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900">{c.nombre}</h3>
                  {c.empresa && <p className="text-xs text-slate-500">{c.empresa}</p>}
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-600">
                {c.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-slate-400" /> {c.email}</p>}
                {c.telefono && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400" /> {c.telefono}</p>}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center">
                <div><Building className="h-3 w-3 mx-auto text-slate-400 mb-0.5" /><div className="text-sm font-bold">{c._count.obras}</div><div className="text-[10px] text-slate-500">obras</div></div>
                <div><ListTodo className="h-3 w-3 mx-auto text-slate-400 mb-0.5" /><div className="text-sm font-bold">{c._count.pendientes}</div><div className="text-[10px] text-slate-500">tareas</div></div>
                <div><div className="text-sm font-bold">{c._count.usuarios}</div><div className="text-[10px] text-slate-500">usuarios</div></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo contratista</DialogTitle>
            <DialogDescription>Registra una empresa contratista.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Constructora del Norte" /></div>
            <div className="space-y-2"><Label>Razón social</Label>
              <Input value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} placeholder="CDN SA de CV" /></div>
            <div className="space-y-2"><Label>RFC</Label>
              <Input value={form.rfc} onChange={(e) => setForm({ ...form, rfc: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Teléfono</Label>
                <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={create} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

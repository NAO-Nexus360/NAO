"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, User, Mail, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ROLE_LABEL } from "@/lib/auth";

const roleColor: Record<string, string> = {
  SUPERVISOR: "bg-purple-100 text-purple-700",
  RESIDENTE: "bg-blue-100 text-blue-700",
  CONTRATISTA: "bg-emerald-100 text-emerald-700",
};

export function AdminUsuariosClient({ initial }: { initial: any }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", password: "password123", role: "CONTRATISTA",
    puesto: "", telefono: "", contratistaId: "",
  });

  async function create() {
    if (!form.name || !form.email) { toast.error("Nombre y correo requeridos"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, contratistaId: form.contratistaId || null }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success(`Usuario creado. Contraseña inicial: ${form.password}`);
      setForm({ name: "", email: "", password: "password123", role: "CONTRATISTA", puesto: "", telefono: "", contratistaId: "" });
      setOpen(false);
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500 mt-1">{initial.usuarios.length} usuarios registrados</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuevo usuario</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {initial.usuarios.map((u: any) => (
          <Card key={u.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center font-semibold text-sm">
                  {u.name.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <Badge className={"text-[10px] " + (roleColor[u.role] || "bg-slate-100 text-slate-700")}>
                  {ROLE_LABEL[u.role as keyof typeof ROLE_LABEL]}
                </Badge>
              </div>
              <h3 className="font-semibold text-slate-900 mt-3">{u.name}</h3>
              {u.puesto && <p className="text-xs text-slate-500">{u.puesto}</p>}
              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <p className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-slate-400" /> {u.email}</p>
                {u.telefono && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400" /> {u.telefono}</p>}
                {u.contratista && <p className="text-xs text-slate-500">Empresa: {u.contratista.nombre}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>Crea un nuevo usuario. Recibirá la contraseña inicial que definas.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2"><Label>Nombre completo *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Juan Pérez" /></div>
            <div className="space-y-2"><Label>Correo electrónico *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="juan@empresa.mx" /></div>
            <div className="space-y-2"><Label>Contraseña inicial</Label>
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <p className="text-[11px] text-slate-500">El usuario podrá cambiarla después.</p></div>
            <div className="space-y-2"><Label>Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPERVISOR">Supervisor (acceso total)</SelectItem>
                  <SelectItem value="RESIDENTE">Residente (crea/edita)</SelectItem>
                  <SelectItem value="CONTRATISTA">Contratista (solo lectura)</SelectItem>
                </SelectContent>
              </Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Puesto</Label>
                <Input value={form.puesto} onChange={(e) => setForm({ ...form, puesto: e.target.value })} /></div>
              <div className="space-y-2"><Label>Teléfono</Label>
                <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
            </div>
            {form.role === "CONTRATISTA" && (
              <div className="space-y-2"><Label>Empresa contratista</Label>
                <Select value={form.contratistaId} onValueChange={(v) => setForm({ ...form, contratistaId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona la empresa" /></SelectTrigger>
                  <SelectContent>{initial.contratistas.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>))}</SelectContent>
                </Select></div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={create} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

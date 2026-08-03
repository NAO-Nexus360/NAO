"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Mail, Phone, Loader2, Pencil, Trash2 } from "lucide-react";
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

const EMPTY_FORM = {
  name: "", email: "", password: "password123", role: "CONTRATISTA",
  puesto: "", telefono: "", contratistaId: "",
};

export function AdminUsuariosClient({ initial, sessionUserId }: { initial: any; sessionUserId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any | null>(null); // null = crear, objeto = editar
  const [form, setForm] = useState({ ...EMPTY_FORM });

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setOpen(true);
  }

  function openEdit(u: any) {
    setEditing(u);
    setForm({
      name: u.name || "",
      email: u.email || "",
      password: "", // vacío = no cambiar
      role: u.role,
      puesto: u.puesto || "",
      telefono: u.telefono || "",
      contratistaId: u.contratistaId || "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name || !form.email) { toast.error("Nombre y correo requeridos"); return; }
    if (!editing && !form.password) { toast.error("Define una contraseña inicial"); return; }
    setSaving(true);
    try {
      if (editing) {
        const payload: any = {
          name: form.name, email: form.email, role: form.role,
          puesto: form.puesto, telefono: form.telefono,
          contratistaId: form.role === "CONTRATISTA" ? (form.contratistaId || null) : null,
        };
        if (form.password) payload.password = form.password; // solo si escribió una nueva
        const res = await fetch(`/api/usuarios/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        toast.success(form.password ? "Usuario actualizado. Nueva contraseña asignada." : "Usuario actualizado");
      } else {
        const res = await fetch("/api/usuarios", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, contratistaId: form.contratistaId || null }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        toast.success(`Usuario creado. Contraseña inicial: ${form.password}`);
      }
      setForm({ ...EMPTY_FORM });
      setEditing(null);
      setOpen(false);
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(u: any) {
    if (!confirm(`¿Eliminar la cuenta de ${u.name}?\n\nYa no podrá entrar al sistema. Su nombre se conserva en el historial de tareas.`)) return;
    try {
      const res = await fetch(`/api/usuarios/${u.id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success(`Cuenta de ${u.name} eliminada`);
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-500 mt-1">{initial.usuarios.length} usuarios registrados</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo usuario</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {initial.usuarios.map((u: any) => {
          const esYo = u.id === sessionUserId;
          return (
            <Card key={u.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center font-semibold text-sm">
                    {u.name.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {esYo && <Badge className="text-[10px] bg-slate-100 text-slate-600">Tú</Badge>}
                    <Badge className={"text-[10px] " + (roleColor[u.role] || "bg-slate-100 text-slate-700")}>
                      {ROLE_LABEL[u.role as keyof typeof ROLE_LABEL]}
                    </Badge>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900 mt-3">{u.name}</h3>
                {u.puesto && <p className="text-xs text-slate-500">{u.puesto}</p>}
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <p className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-slate-400" /> {u.email}</p>
                  {u.telefono && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400" /> {u.telefono}</p>}
                  {u.contratista && <p className="text-xs text-slate-500">Empresa: {u.contratista.nombre}</p>}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-1.5">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openEdit(u)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  {!esYo && (
                    <Button size="sm" variant="outline"
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => handleDelete(u)}>
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Editar a ${editing.name}` : "Nuevo usuario"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Modifica los datos de la cuenta. La contraseña solo cambia si escribes una nueva."
                : "Crea un nuevo usuario. Recibirá la contraseña inicial que definas."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2"><Label>Nombre completo *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Juan Pérez" /></div>
            <div className="space-y-2"><Label>Correo electrónico *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="juan@empresa.mx" /></div>
            <div className="space-y-2">
              <Label>{editing ? "Nueva contraseña (opcional)" : "Contraseña inicial"}</Label>
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? "Dejar en blanco para no cambiarla" : ""} />
              <p className="text-[11px] text-slate-500">
                {editing ? "Escríbela solo si quieres asignarle una contraseña nueva." : "El usuario podrá cambiarla después."}
              </p>
            </div>
            <div className="space-y-2"><Label>Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPERVISOR">Supervisor (acceso total)</SelectItem>
                  <SelectItem value="RESIDENTE">Residente (crea/edita)</SelectItem>
                  <SelectItem value="CONTRATISTA">Contratista (solo lectura)</SelectItem>
                </SelectContent>
              </Select>
              {editing?.id === sessionUserId && (
                <p className="text-[11px] text-amber-600">No puedes quitarte a ti mismo el rol de Supervisor.</p>
              )}
            </div>
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
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

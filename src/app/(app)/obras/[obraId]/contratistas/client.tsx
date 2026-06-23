"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase, ListTodo, CheckCircle2, AlertOctagon, ArrowRight, Mail, Phone,
  Plus, UserPlus, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export function ContratistasObraClient({
  obra, contratistasObra, contratistasDisponibles, user,
}: {
  obra: any;
  contratistasObra: any[];
  contratistasDisponibles: { id: string; nombre: string; empresa: string | null }[];
  user: any;
}) {
  const router = useRouter();
  const isSupervisor = user.role === "SUPERVISOR";

  const [openAsignar, setOpenAsignar] = useState(false);
  const [openCrear, setOpenCrear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contratistaSeleccionado, setContratistaSeleccionado] = useState("");
  const [nuevo, setNuevo] = useState({ nombre: "", empresa: "", rfc: "", telefono: "", email: "" });

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  async function asignar() {
    if (!contratistaSeleccionado) { toast.error("Selecciona un contratista"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/obras/${obra.id}/contratistas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contratistaId: contratistaSeleccionado }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success("Contratista asignado a la obra");
      setOpenAsignar(false);
      setContratistaSeleccionado("");
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function crearYAsignar() {
    if (!nuevo.nombre) { toast.error("El nombre es requerido"); return; }
    setSaving(true);
    try {
      // 1) Crear el contratista
      const res1 = await fetch("/api/contratistas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevo),
      });
      if (!res1.ok) { const err = await res1.json(); throw new Error(err.error); }
      const created = await res1.json();

      // 2) Asignarlo a esta obra
      const res2 = await fetch(`/api/obras/${obra.id}/contratistas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contratistaId: created.id }),
      });
      if (!res2.ok) { const err = await res2.json(); throw new Error(err.error); }

      toast.success("Contratista creado y asignado a la obra");
      setOpenCrear(false);
      setNuevo({ nombre: "", empresa: "", rfc: "", telefono: "", email: "" });
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contratistas</h1>
          <p className="text-sm text-slate-500 mt-1">
            {obra.nombre} · {contratistasObra.length}{" "}
            {contratistasObra.length === 1 ? "contratista asignado" : "contratistas asignados"}
          </p>
        </div>
        {isSupervisor && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpenAsignar(true)} disabled={contratistasDisponibles.length === 0}>
              <UserPlus className="h-4 w-4" /> Asignar existente
            </Button>
            <Button onClick={() => setOpenCrear(true)}>
              <Plus className="h-4 w-4" /> Nuevo contratista
            </Button>
          </div>
        )}
      </div>

      {contratistasObra.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Briefcase className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">Sin contratistas asignados</p>
            <p className="text-sm text-slate-400 mt-1">
              {isSupervisor
                ? "Asigna uno existente o crea uno nuevo con los botones de arriba"
                : "Pide a tu supervisor que asigne contratistas a esta obra"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contratistasObra.map((oc: any) => {
            const c = oc.contratista;
            const total = c.pendientes.length;
            const completados = c.pendientes.filter((p: any) => p.estatus === "COMPLETADO").length;
            const vencidos = c.pendientes.filter(
              (p: any) =>
                ["PENDIENTE", "EN_PROGRESO", "EN_REVISION"].includes(p.estatus) &&
                new Date(p.fechaEntrega) < hoy
            ).length;
            const cumplimiento = total > 0 ? Math.round((completados / total) * 100) : 0;

            return (
              <Link key={c.id} href={`/obras/${obra.id}/contratistas/${c.id}`} className="group">
                <Card className="h-full hover:shadow-lg hover:border-orange-200 transition-all overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-orange-400 to-orange-600" />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-11 w-11 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                        <Briefcase className="h-5 w-5 text-orange-600" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-orange-600 group-hover:translate-x-0.5 transition" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mt-3 line-clamp-1">{c.nombre}</h3>
                    {c.empresa && <p className="text-xs text-slate-500 line-clamp-1">{c.empresa}</p>}

                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      {c.email && (
                        <p className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 text-slate-400 shrink-0" /> {c.email}
                        </p>
                      )}
                      {c.telefono && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-slate-400 shrink-0" /> {c.telefono}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center">
                      <div>
                        <ListTodo className="h-3 w-3 mx-auto text-slate-400 mb-0.5" />
                        <div className="text-sm font-bold text-slate-900">{total}</div>
                        <div className="text-[10px] text-slate-500">tareas</div>
                      </div>
                      <div>
                        <CheckCircle2 className="h-3 w-3 mx-auto text-emerald-500 mb-0.5" />
                        <div className="text-sm font-bold text-slate-900">{cumplimiento}%</div>
                        <div className="text-[10px] text-slate-500">cumplim.</div>
                      </div>
                      <div>
                        <AlertOctagon className={`h-3 w-3 mx-auto mb-0.5 ${vencidos > 0 ? "text-red-500" : "text-slate-400"}`} />
                        <div className={`text-sm font-bold ${vencidos > 0 ? "text-red-600" : "text-slate-900"}`}>
                          {vencidos}
                        </div>
                        <div className="text-[10px] text-slate-500">vencidos</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Modal: Asignar contratista existente */}
      <Dialog open={openAsignar} onOpenChange={setOpenAsignar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar contratista a {obra.nombre}</DialogTitle>
            <DialogDescription>
              Elige un contratista ya registrado en el sistema para asignarlo a esta obra.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label>Contratista</Label>
            <Select value={contratistaSeleccionado} onValueChange={setContratistaSeleccionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un contratista..." />
              </SelectTrigger>
              <SelectContent>
                {contratistasDisponibles.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">Todos están asignados ya. Crea uno nuevo abajo.</div>
                ) : (
                  contratistasDisponibles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}{c.empresa ? ` — ${c.empresa}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAsignar(false)}>Cancelar</Button>
            <Button onClick={asignar} disabled={saving || !contratistaSeleccionado}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Asignar a la obra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Crear contratista nuevo */}
      <Dialog open={openCrear} onOpenChange={setOpenCrear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo contratista</DialogTitle>
            <DialogDescription>
              Crea una nueva empresa contratista. Quedará automáticamente asignada a {obra.nombre}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Constructora del Norte" />
            </div>
            <div className="space-y-2">
              <Label>Razón social</Label>
              <Input value={nuevo.empresa} onChange={(e) => setNuevo({ ...nuevo, empresa: e.target.value })} placeholder="CDN SA de CV" />
            </div>
            <div className="space-y-2">
              <Label>RFC</Label>
              <Input value={nuevo.rfc} onChange={(e) => setNuevo({ ...nuevo, rfc: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCrear(false)}>Cancelar</Button>
            <Button onClick={crearYAsignar} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear y asignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

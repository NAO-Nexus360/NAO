"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Upload, Loader2, Trash2, ListTodo, Calendar, ChevronDown, ChevronUp, Info } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

export function MinutasClient({ obra, user, initial }: { obra: any; user: any; initial: any }) {
  const router = useRouter();
  const [minutas, setMinutas] = useState<any[]>(initial.minutas);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const isReadonly = user.role === "CONTRATISTA";
  const isSupervisor = user.role === "SUPERVISOR";

  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [archivoUrl, setArchivoUrl] = useState<string | null>(null);
  const [archivoNombre, setArchivoNombre] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitulo(""); setContenido(""); setFecha(new Date().toISOString().split("T")[0]);
    setArchivoUrl(null); setArchivoNombre(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("folder", "minutas");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Error al subir archivo");
      const data = await res.json();
      setArchivoUrl(data.url); setArchivoNombre(data.nombre);
      toast.success("Archivo adjuntado");
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); e.target.value = ""; }
  }

  async function handleCreate() {
    if (!titulo || !contenido) { toast.error("Título y contenido requeridos"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/minutas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ obraId: obra.id, titulo, contenido, fecha, archivoUrl, archivoNombre }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const minuta = await res.json();
      setMinutas((prev) => [{ ...minuta, subidoPor: { name: user.name }, _count: { pendientes: 0 } }, ...prev]);
      toast.success("Minuta guardada");
      setOpen(false); reset(); router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta minuta?")) return;
    try {
      const res = await fetch(`/api/minutas/${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      setMinutas((prev) => prev.filter((m) => m.id !== id));
      toast.success("Eliminada");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Minutas</h1>
          <p className="text-sm text-slate-500 mt-1">{obra.nombre} · Registro de juntas, recorridos y acuerdos</p>
        </div>
        {!isReadonly && (
          <Button onClick={() => { reset(); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Nueva minuta
          </Button>
        )}
      </div>

      {isReadonly && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
          🔍 Modo solo lectura. Puedes consultar las minutas pero no crear nuevas.
        </div>
      )}

      {minutas.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">Aún no hay minutas</p>
            <p className="text-sm text-slate-400 mt-1">Captura tu primera minuta para empezar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {minutas.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-start gap-4 p-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900">{m.titulo}</h3>
                      {m._count?.pendientes > 0 && (
                        <Badge variant="info" className="gap-1">
                          <ListTodo className="h-3 w-3" /> {m._count.pendientes} pendientes
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(m.fecha)}</span>
                      <span>·</span><span>{m.subidoPor?.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                      {expanded === m.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    {isSupervisor && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {expanded === m.id && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                    <Label className="text-xs uppercase tracking-wider text-slate-500">Contenido</Label>
                    <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap max-h-64 overflow-y-auto">{m.contenido}</p>
                    {m.archivoUrl && (
                      <a href={m.archivoUrl} target="_blank" rel="noreferrer"
                         className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-3">
                        <FileText className="h-4 w-4" /> Ver archivo adjunto
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva minuta</DialogTitle>
            <DialogDescription>Captura los acuerdos y pendientes de la junta.</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p><b>Tip:</b> Captura todos los acuerdos en el texto. Luego, ve a la pestaña de Pendientes para crear las tareas individuales con sus responsables y fechas.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="m-titulo">Título</Label>
              <Input id="m-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Junta semanal - Semana 12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-fecha">Fecha de la junta</Label>
              <Input id="m-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-contenido">Contenido</Label>
              <Textarea id="m-contenido" value={contenido} onChange={(e) => setContenido(e.target.value)}
                placeholder="Acuerdos, asistentes, pendientes, observaciones..." rows={10} />
            </div>
            <div className="space-y-2">
              <Label>Archivo adjunto (opcional)</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-4">
                <label className="flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 rounded transition py-2">
                  {uploading ? (<Loader2 className="h-5 w-5 text-slate-400 animate-spin mb-1" />) : (<Upload className="h-5 w-5 text-slate-400 mb-1" />)}
                  <span className="text-sm text-slate-600">{uploading ? "Subiendo..." : archivoNombre || "Subir PDF, foto o documento"}</span>
                  <input type="file" accept=".pdf,image/*,.doc,.docx" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar minuta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

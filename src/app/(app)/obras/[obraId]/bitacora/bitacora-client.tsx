"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Loader2, Upload, X, Cloud, Users, TrendingUp, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

export function BitacoraClient({ obra, user, initial }: { obra: any; user: any; initial: any }) {
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>(initial.entries);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isReadonly = user.role === "CONTRATISTA";

  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [avance, setAvance] = useState<number | "">("");
  const [clima, setClima] = useState("");
  const [personal, setPersonal] = useState<number | "">("");
  const [evidencias, setEvidencias] = useState<any[]>([]);

  function reset() {
    setTitulo(""); setContenido(""); setFecha(new Date().toISOString().split("T")[0]);
    setAvance(""); setClima(""); setPersonal(""); setEvidencias([]);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: any[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file); fd.append("folder", "bitacora");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) uploaded.push(await res.json());
      }
      setEvidencias((prev) => [...prev, ...uploaded]);
    } finally { setUploading(false); e.target.value = ""; }
  }

  async function handleCreate() {
    if (!titulo || !contenido) { toast.error("Título y contenido requeridos"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/bitacora", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          obraId: obra.id, titulo, contenido, fecha,
          avance: avance === "" ? null : Number(avance),
          clima: clima || null,
          personal: personal === "" ? null : Number(personal),
          evidencias,
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const entry = await res.json();
      setEntries((prev) => [entry, ...prev]);
      toast.success("Registro agregado");
      setOpen(false); reset(); router.refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bitácora</h1>
          <p className="text-sm text-slate-500 mt-1">{obra.nombre} · Registro diario de avances</p>
        </div>
        {!isReadonly && (
          <Button onClick={() => { reset(); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Nuevo registro
          </Button>
        )}
      </div>

      {isReadonly && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
          🔍 Modo solo lectura.
        </div>
      )}

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <BookOpen className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">Bitácora vacía</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-200 hidden md:block" />
          <div className="space-y-4">
            {entries.map((e) => (
              <div key={e.id} className="md:pl-12 relative">
                <div className="absolute left-2.5 top-5 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-blue-100 hidden md:block" />
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900">{e.titulo}</h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(e.fecha)}</span>
                          <span>·</span><span>{e.autor?.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {typeof e.avance === "number" && <Badge variant="info" className="gap-1"><TrendingUp className="h-3 w-3" /> {e.avance}%</Badge>}
                        {e.clima && <Badge variant="secondary" className="gap-1"><Cloud className="h-3 w-3" /> {e.clima}</Badge>}
                        {typeof e.personal === "number" && <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> {e.personal}</Badge>}
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{e.contenido}</p>
                    {typeof e.avance === "number" && <div className="mt-3"><Progress value={e.avance} className="h-1.5" /></div>}
                    {e.evidencias?.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {e.evidencias.map((ev: any) => (
                          <a key={ev.id} href={ev.url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-slate-200 hover:opacity-90">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={ev.url} alt="" className="w-full h-20 object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo registro de bitácora</DialogTitle>
            <DialogDescription>Documenta el avance del día.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="b-titulo">Título</Label>
              <Input id="b-titulo" value={titulo} onChange={(ev) => setTitulo(ev.target.value)} placeholder="Ej: Avance general - día 45" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-2"><Label htmlFor="b-fecha">Fecha</Label>
                <Input id="b-fecha" type="date" value={fecha} onChange={(ev) => setFecha(ev.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="b-avance">% Avance</Label>
                <Input id="b-avance" type="number" min={0} max={100} value={avance}
                  onChange={(ev) => setAvance(ev.target.value === "" ? "" : Number(ev.target.value))} placeholder="0-100" /></div>
              <div className="space-y-2"><Label htmlFor="b-clima">Clima</Label>
                <Input id="b-clima" value={clima} onChange={(ev) => setClima(ev.target.value)} placeholder="Despejado" /></div>
              <div className="space-y-2"><Label htmlFor="b-personal">Personal</Label>
                <Input id="b-personal" type="number" min={0} value={personal}
                  onChange={(ev) => setPersonal(ev.target.value === "" ? "" : Number(ev.target.value))} placeholder="#" /></div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="b-contenido">Descripción</Label>
              <Textarea id="b-contenido" value={contenido} onChange={(ev) => setContenido(ev.target.value)}
                placeholder="Actividades, observaciones, incidencias..." rows={5} />
            </div>

            <div className="space-y-2">
              <Label>Fotos del día</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-4">
                <label className="flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 rounded transition py-3">
                  {uploading ? (<Loader2 className="h-5 w-5 text-slate-400 animate-spin mb-1" />) : (<Upload className="h-5 w-5 text-slate-400 mb-1" />)}
                  <span className="text-sm text-slate-600">{uploading ? "Subiendo..." : "Subir fotos"}</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
                {evidencias.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {evidencias.map((ev, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ev.url} alt="" className="w-full h-16 object-cover" />
                        <button type="button" onClick={() => setEvidencias((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

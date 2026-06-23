"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EstadoMetaBadge } from "@/components/common/estado-meta-badge";
import { calcularEstadoMeta, diasDiferencia } from "@/lib/meta-helpers";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Calendar, Briefcase, User, Image as ImageIcon, X, ChevronLeft, ChevronRight,
  Upload, Loader2, Trash2, Target, FileText,
} from "lucide-react";

export function MetaDetailDialog({
  meta,
  open,
  onOpenChange,
  user,
}: {
  meta: any | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  user?: any;
}) {
  const router = useRouter();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [evidenciasLocales, setEvidenciasLocales] = useState<any[] | null>(null);

  if (!meta) return null;
  const estado = calcularEstadoMeta(meta);
  const dif = diasDiferencia(meta.fechaFinPlaneada, meta.fechaReal);
  const evidencias = evidenciasLocales || meta.evidencias || [];
  const imagenes = evidencias.filter(
    (e: any) => e.tipo === "image" || e.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  );
  const archivos = evidencias.filter(
    (e: any) => !(e.tipo === "image" || e.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i))
  );

  const canUpload =
    user &&
    (user.role === "SUPERVISOR" ||
      user.role === "RESIDENTE" ||
      (user.role === "CONTRATISTA" &&
        user.contratistaId &&
        user.contratistaId === meta.contratistaId));

  function puedeEliminar(ev: any): boolean {
    if (!user) return false;
    if (user.role === "SUPERVISOR" || user.role === "RESIDENTE") return true;
    if (user.role === "CONTRATISTA") return ev.subidoPor?.id === user.id || ev.subidoPorId === user.id;
    return false;
  }

  function next() { setLightbox((i) => (i === null ? null : (i + 1) % imagenes.length)); }
  function prev() { setLightbox((i) => (i === null ? null : (i - 1 + imagenes.length) % imagenes.length)); }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: any[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "metas");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) { toast.error("Error subiendo " + file.name); continue; }
        const data = await res.json();
        uploaded.push(data);
      }
      if (uploaded.length === 0) return;

      const res = await fetch(`/api/metas/${meta.id}/evidencias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidencias: uploaded }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const nuevas = await res.json();

      setEvidenciasLocales([...nuevas, ...evidencias]);
      toast.success(`${uploaded.length} foto(s) subida(s)`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error al subir");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function eliminarEvidencia(evidenciaId: string) {
    if (!confirm("¿Eliminar esta foto?")) return;
    try {
      const res = await fetch(
        `/api/metas/${meta.id}/evidencias?evidenciaId=${evidenciaId}`,
        { method: "DELETE" }
      );
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      setEvidenciasLocales(evidencias.filter((e: any) => e.id !== evidenciaId));
      toast.success("Foto eliminada");
      router.refresh();
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="pr-6">
              <p className="text-xs font-mono text-slate-500 mb-1">#{meta.folio}</p>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-600 shrink-0" />
                {meta.nombre}
              </DialogTitle>
              {meta.notas && (
                <p className="text-sm text-slate-600 mt-2 italic">{meta.notas}</p>
              )}
            </div>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 pb-3 border-b">
            <EstadoMetaBadge value={estado} />
            {dif !== null && (
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded",
                dif > 0 ? "bg-red-50 text-red-700" : dif < 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-700"
              )}>
                {dif > 0 ? `${dif} días tarde` : dif < 0 ? `${Math.abs(dif)} días adelantado` : "Cumplida a tiempo"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <InfoCell icon={Briefcase} label="Contratista" value={meta.contratista?.nombre || "—"} />
            <InfoCell icon={Calendar} label="Inicio planeado" value={formatDate(meta.fechaInicioPlaneada)} />
            <InfoCell icon={Calendar} label="Fin planeado" value={formatDate(meta.fechaFinPlaneada)} />
            <InfoCell icon={Calendar} label="Fecha real" value={meta.fechaReal ? formatDate(meta.fechaReal) : "—"}
              valueClass={meta.fechaReal && dif !== null && dif > 0 ? "text-red-600 font-semibold" : ""} />
          </div>

          {/* Sección de fotos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold flex items-center gap-2 text-sm">
                <ImageIcon className="h-4 w-4" />
                Fotos {imagenes.length > 0 && `(${imagenes.length})`}
              </h4>
              {canUpload && (
                <label className="inline-flex">
                  <Button asChild size="sm" disabled={uploading}>
                    <span className="cursor-pointer">
                      {uploading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</>
                      ) : (
                        <><Upload className="h-4 w-4" /> Subir foto</>
                      )}
                    </span>
                  </Button>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {imagenes.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {imagenes.map((ev: any, i: number) => (
                  <div key={ev.id} className="relative group rounded-lg overflow-hidden border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setLightbox(i)}
                      className="block w-full hover:opacity-90 transition"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ev.url} alt="" className="w-full h-28 object-cover" />
                    </button>
                    {ev.subidoPor?.name && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] px-1.5 py-1 truncate">
                        {ev.subidoPor.name}
                      </div>
                    )}
                    {puedeEliminar(ev) && (
                      <button
                        type="button"
                        onClick={() => eliminarEvidencia(ev.id)}
                        className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                <ImageIcon className="h-6 w-6 mx-auto mb-1 text-slate-300" />
                Sin fotos {canUpload && "— sube la primera con el botón de arriba"}
              </div>
            )}
          </div>

          {archivos.length > 0 && (
            <div>
              <h4 className="font-semibold flex items-center gap-2 text-sm mb-2">
                <FileText className="h-4 w-4" /> Archivos ({archivos.length})
              </h4>
              <div className="space-y-1">
                {archivos.map((ev: any) => (
                  <a
                    key={ev.id}
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                  >
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span className="flex-1 truncate">{ev.descripcion || "Archivo adjunto"}</span>
                    <span className="text-xs text-slate-400">Abrir</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {lightbox !== null && imagenes[lightbox] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button type="button" onClick={(e) => { e.stopPropagation(); setLightbox(null); }} className="absolute top-4 right-4 text-white hover:bg-white/10 rounded-full p-2">
            <X className="h-6 w-6" />
          </button>
          {imagenes.length > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 rounded-full p-2">
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 rounded-full p-2">
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagenes[lightbox].url} alt="" onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/50 px-3 py-1 rounded-full">
            {lightbox + 1} / {imagenes.length}
          </div>
        </div>
      )}
    </>
  );
}

function InfoCell({ icon: Icon, label, value, valueClass }: { icon: any; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
        <p className={cn("text-sm text-slate-900 truncate", valueClass)}>{value}</p>
      </div>
    </div>
  );
}

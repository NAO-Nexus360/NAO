"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Loader2, Trash2, Download, Star, RotateCcw, FileSpreadsheet, FileType2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

type Programa = {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  esActual: boolean;
  createdAt: string;
  subidoPor: { name: string };
};

export function ProgramaObraSection({
  programas: initial,
  obraId,
  contratistaId,
  user,
}: {
  programas: Programa[];
  obraId: string;
  contratistaId: string;
  user: any;
}) {
  const router = useRouter();
  const [programas, setProgramas] = useState<Programa[]>(initial);
  const [uploading, setUploading] = useState(false);
  const isSupervisor = user.role === "SUPERVISOR";
  const canEdit = user.role !== "CONTRATISTA" || user.contratistaId === contratistaId;

  function detectarTipo(nombre: string): string {
    const lower = nombre.toLowerCase();
    if (lower.endsWith(".pdf")) return "pdf";
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) return "excel";
    return "otro";
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1) Subir a Cloudinary
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "programas");
      const resUp = await fetch("/api/upload", { method: "POST", body: fd });
      if (!resUp.ok) throw new Error("Error subiendo archivo");
      const fileData = await resUp.json();

      // 2) Crear el registro
      const res = await fetch("/api/programas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          obraId,
          contratistaId,
          url: fileData.url,
          publicId: fileData.publicId,
          nombre: file.name,
          tipo: detectarTipo(file.name),
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const nuevo = await res.json();

      // Marcar los anteriores como no actuales en el estado local
      setProgramas((prev) => [nuevo, ...prev.map((p) => ({ ...p, esActual: false }))]);
      toast.success("Programa de obra subido");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error al subir");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta versión del programa? No se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/programas/${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      setProgramas((prev) => prev.filter((p) => p.id !== id));
      toast.success("Versión eliminada");
      router.refresh();
    } catch (e: any) { toast.error(e.message); }
  }

  async function marcarActual(id: string) {
    try {
      const res = await fetch(`/api/programas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ esActual: true }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      setProgramas((prev) => prev.map((p) => ({ ...p, esActual: p.id === id })));
      toast.success("Marcada como versión actual");
    } catch (e: any) { toast.error(e.message); }
  }

  const actual = programas.find((p) => p.esActual);
  const anteriores = programas.filter((p) => !p.esActual);

  function IconoTipo({ tipo }: { tipo: string }) {
    if (tipo === "pdf") return <FileType2 className="h-5 w-5 text-red-600" />;
    if (tipo === "excel") return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
    return <FileText className="h-5 w-5 text-slate-600" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Programa de obra
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Excel o PDF original del programa comprometido por el contratista
            </p>
          </div>
          {canEdit && (
            <label className="inline-flex">
              <Button asChild disabled={uploading} size="sm">
                <span className="cursor-pointer">
                  {uploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</>
                  ) : (
                    <><Upload className="h-4 w-4" /> {actual ? "Subir nueva versión" : "Subir programa"}</>
                  )}
                </span>
              </Button>
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {programas.length === 0 ? (
          <div className="py-10 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">Sin programa de obra subido</p>
            {canEdit ? (
              <p className="text-sm text-slate-400 mt-1">
                Sube el Excel o PDF del programa comprometido por este contratista
              </p>
            ) : (
              <p className="text-sm text-slate-400 mt-1">
                Pide al supervisor o residente que suban el programa de este contratista
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Versión actual */}
            {actual && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Versión actual
                </p>
                <div className="border-2 border-emerald-200 bg-emerald-50/40 rounded-lg p-3 flex items-center gap-3">
                  <IconoTipo tipo={actual.tipo} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-slate-900 truncate">{actual.nombre}</p>
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] gap-1 shrink-0">
                        <Star className="h-2.5 w-2.5 fill-current" /> Actual
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Subido {formatDateTime(actual.createdAt)} por {actual.subidoPor?.name}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <a href={actual.url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="gap-1">
                        <Download className="h-3.5 w-3.5" /> Abrir
                      </Button>
                    </a>
                    {isSupervisor && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                        onClick={() => eliminar(actual.id)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Versiones anteriores */}
            {anteriores.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Versiones anteriores ({anteriores.length})
                </p>
                <div className="space-y-2">
                  {anteriores.map((p) => (
                    <div key={p.id} className="border border-slate-200 rounded-lg p-2.5 flex items-center gap-3 hover:bg-slate-50">
                      <IconoTipo tipo={p.tipo} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-700 truncate">{p.nombre}</p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(p.createdAt)} · {p.subidoPor?.name}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <a href={p.url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="ghost" className="gap-1 text-xs">
                            <Download className="h-3 w-3" /> Abrir
                          </Button>
                        </a>
                        {user.role !== "CONTRATISTA" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-xs"
                            onClick={() => marcarActual(p.id)}
                            title="Marcar como versión actual"
                          >
                            <RotateCcw className="h-3 w-3" /> Restaurar
                          </Button>
                        )}
                        {isSupervisor && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-600 hover:bg-red-50"
                            onClick={() => eliminar(p.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowUp, ArrowRight, ArrowDown, CheckCircle2, Clock, PlayCircle, Eye, XCircle } from "lucide-react";

export function PrioridadBadge({ value }: { value: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    CRITICA: { label: "Crítica", cls: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
    ALTA: { label: "Alta", cls: "bg-orange-100 text-orange-700 border-orange-200", icon: ArrowUp },
    MEDIA: { label: "Media", cls: "bg-amber-100 text-amber-700 border-amber-200", icon: ArrowRight },
    BAJA: { label: "Baja", cls: "bg-slate-100 text-slate-600 border-slate-200", icon: ArrowDown },
  };
  const m = map[value] ?? map.MEDIA;
  const Icon = m.icon;
  return <Badge variant="outline" className={cn("gap-1 font-medium", m.cls)}><Icon className="h-3 w-3" /> {m.label}</Badge>;
}

export function EstatusBadge({ value }: { value: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    PENDIENTE: { label: "Pendiente", cls: "bg-slate-100 text-slate-700 border-slate-200", icon: Clock },
    EN_PROGRESO: { label: "En progreso", cls: "bg-blue-100 text-blue-700 border-blue-200", icon: PlayCircle },
    EN_REVISION: { label: "En revisión", cls: "bg-violet-100 text-violet-700 border-violet-200", icon: Eye },
    COMPLETADO: { label: "Completado", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    CANCELADO: { label: "Cancelado", cls: "bg-rose-100 text-rose-700 border-rose-200", icon: XCircle },
  };
  const m = map[value] ?? map.PENDIENTE;
  const Icon = m.icon;
  return <Badge variant="outline" className={cn("gap-1 font-medium", m.cls)}><Icon className="h-3 w-3" /> {m.label}</Badge>;
}

export const AREA_LABEL: Record<string, string> = {
  ESTRUCTURA: "Estructura",
  OBRA_CIVIL: "Obra civil",
  OBRA_BLANCA: "Obra blanca",
  INSTALACIONES: "Instalaciones",
  ACABADOS: "Acabados",
  PROYECTO: "Proyecto",
  ADMINISTRATIVO: "Administrativo",
  VENTA: "Venta",
  POSTVENTA: "Postventa",
};

export const AREA_COLOR: Record<string, string> = {
  ESTRUCTURA: "bg-stone-100 text-stone-700 border-stone-200",
  OBRA_CIVIL: "bg-amber-100 text-amber-800 border-amber-200",
  OBRA_BLANCA: "bg-zinc-100 text-zinc-700 border-zinc-200",
  INSTALACIONES: "bg-cyan-100 text-cyan-700 border-cyan-200",
  ACABADOS: "bg-pink-100 text-pink-700 border-pink-200",
  PROYECTO: "bg-indigo-100 text-indigo-700 border-indigo-200",
  ADMINISTRATIVO: "bg-slate-100 text-slate-700 border-slate-200",
  VENTA: "bg-emerald-100 text-emerald-700 border-emerald-200",
  POSTVENTA: "bg-teal-100 text-teal-700 border-teal-200",
};

export function AreaBadge({ value }: { value: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", AREA_COLOR[value] || "bg-slate-100 text-slate-700 border-slate-200")}>
      {AREA_LABEL[value] || value}
    </Badge>
  );
}

// Para compatibilidad con código que aún usa CategoriaBadge
export const CategoriaBadge = AreaBadge;

export const AREAS_LIST = Object.keys(AREA_LABEL);

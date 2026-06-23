"use client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, AlertOctagon, PlayCircle, Clock } from "lucide-react";
import {
  EstadoMeta, ESTADO_META_LABEL, ESTADO_META_CLASS,
} from "@/lib/meta-helpers";

export function EstadoMetaBadge({ value }: { value: EstadoMeta }) {
  const icons: Record<EstadoMeta, any> = {
    CUMPLIDA_A_TIEMPO: CheckCircle2,
    CUMPLIDA_TARDE: AlertTriangle,
    VENCIDA: AlertOctagon,
    EN_CURSO: PlayCircle,
    PROXIMA: Clock,
  };
  const Icon = icons[value];
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", ESTADO_META_CLASS[value])}>
      <Icon className="h-3 w-3" />
      {ESTADO_META_LABEL[value]}
    </Badge>
  );
}

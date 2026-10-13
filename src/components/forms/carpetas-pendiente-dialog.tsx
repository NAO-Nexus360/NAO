"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Folder } from "lucide-react";

// Elegir en qué carpetas personales está un pendiente (cada persona ve solo sus carpetas)
export function CarpetasPendienteDialog({
  open, onOpenChange, pendienteId, carpetas, onToggle, onNueva,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  pendienteId: string | null;
  carpetas: { id: string; nombre: string; pendienteIds: string[] }[];
  onToggle: (carpetaId: string, pendienteId: string, agregar: boolean) => void;
  onNueva: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Carpetas</DialogTitle>
          <DialogDescription>Elige en qué carpetas quieres este pendiente. Solo tú las ves.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1 max-h-[50vh] overflow-y-auto">
          {carpetas.length === 0 && (
            <p className="text-sm text-slate-500 py-2">Aún no tienes carpetas en esta obra.</p>
          )}
          {carpetas.map((c) => {
            const marcada = !!pendienteId && c.pendienteIds.includes(pendienteId);
            return (
              <label key={c.id} className="flex items-center gap-2 px-2 py-2 rounded hover:bg-slate-50 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-blue-600"
                  checked={marcada}
                  onChange={(e) => pendienteId && onToggle(c.id, pendienteId, e.target.checked)}
                />
                <Folder className="h-4 w-4 text-slate-400" />
                <span className="flex-1 truncate">{c.nombre}</span>
              </label>
            );
          })}
        </div>
        <button type="button" onClick={onNueva} className="text-sm text-blue-600 hover:underline text-left">
          + Nueva carpeta
        </button>
      </DialogContent>
    </Dialog>
  );
}

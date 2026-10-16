"use client";
import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NotificacionesPanel, useNotificaciones } from "@/components/notificaciones-panel";

export function NotificacionesBoton() {
  const [abierto, setAbierto] = useState(false);
  const { estado, revisarEstado } = useNotificaciones();
  return (
    <>
      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setAbierto(true)} title="Notificaciones">
        {estado === "activas" ? <Bell className="h-4 w-4 text-emerald-600" /> : <BellOff className="h-4 w-4 text-slate-500" />}
      </Button>
      <Dialog open={abierto} onOpenChange={(b) => { setAbierto(b); if (!b) revisarEstado(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Notificaciones</DialogTitle>
            <DialogDescription>Recibe avisos en este dispositivo cuando te asignen un pendiente.</DialogDescription>
          </DialogHeader>
          <NotificacionesPanel />
        </DialogContent>
      </Dialog>
    </>
  );
}

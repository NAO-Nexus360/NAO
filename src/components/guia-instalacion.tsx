"use client";
import { useEffect, useState } from "react";
import { Share, Plus, MoreVertical, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CLAVE = "nao-guia-instalacion-vista";

const esIPhone = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const esAndroid = () => /Android/.test(navigator.userAgent);
const esAppInstalada = () =>
  (navigator as any).standalone === true || window.matchMedia("(display-mode: standalone)").matches;

// Instrucciones para agregar la app a la pantalla de inicio
export function GuiaInstalacionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const [plataforma, setPlataforma] = useState<"iphone" | "android" | "otra">("otra");
  const [eventoInstalar, setEventoInstalar] = useState<any>(null);

  useEffect(() => {
    setPlataforma(esIPhone() ? "iphone" : esAndroid() ? "android" : "otra");
    const alPreguntar = (e: Event) => { e.preventDefault(); setEventoInstalar(e); };
    window.addEventListener("beforeinstallprompt", alPreguntar);
    return () => window.removeEventListener("beforeinstallprompt", alPreguntar);
  }, []);

  const iPhone = (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm">iPhone</h4>
      <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">
        <li>Abre esta página en <b>Safari</b>.</li>
        <li>Toca el botón <b>Compartir</b> <Share className="inline h-4 w-4 align-text-bottom" /> (cuadro con una flecha hacia arriba).</li>
        <li>Desliza y elige <b>Agregar a pantalla de inicio</b> <Plus className="inline h-4 w-4 align-text-bottom" />.</li>
        <li>Toca <b>Agregar</b>. El icono aparecerá en tu pantalla de inicio.</li>
        <li>Abre la app <b>desde ese icono</b>, no desde Safari. Así podrás recibir notificaciones.</li>
      </ol>
    </div>
  );

  const android = (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm">Android</h4>
      {eventoInstalar && (
        <Button size="sm" onClick={async () => { await eventoInstalar.prompt(); setEventoInstalar(null); }}>
          <Smartphone className="h-4 w-4" /> Instalar ahora
        </Button>
      )}
      <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">
        <li>Abre esta página en <b>Chrome</b>.</li>
        <li>Toca el menú <MoreVertical className="inline h-4 w-4 align-text-bottom" /> (tres puntos).</li>
        <li>Elige <b>Instalar app</b> o <b>Agregar a pantalla de inicio</b>.</li>
        <li>Confirma. Abre la app desde su icono.</li>
      </ol>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Instala Nexus obra en tu teléfono</DialogTitle>
          <DialogDescription>
            Agrégala a la pantalla de inicio para abrirla como una app y recibir notificaciones.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {plataforma === "android" ? <>{android}{iPhone}</> : <>{iPhone}{android}</>}
        </div>
        <Button onClick={() => onOpenChange(false)}>Entendido</Button>
      </DialogContent>
    </Dialog>
  );
}

// Se muestra sola la primera vez que alguien entra desde un teléfono sin tener la app instalada
export function GuiaInstalacionAutomatica() {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    try {
      const esTelefono = esIPhone() || esAndroid();
      if (esTelefono && !esAppInstalada() && !localStorage.getItem(CLAVE)) setAbierto(true);
    } catch { /* sin almacenamiento: no se muestra */ }
  }, []);

  return (
    <GuiaInstalacionDialog
      open={abierto}
      onOpenChange={(b) => {
        setAbierto(b);
        if (!b) { try { localStorage.setItem(CLAVE, "1"); } catch { /* ignorar */ } }
      }}
    />
  );
}

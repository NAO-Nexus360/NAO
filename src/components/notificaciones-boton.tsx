"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Estado = "cargando" | "no-soportado" | "falta-instalar" | "bloqueadas" | "inactivas" | "activas";

function base64AUint8(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(b64);
  return Uint8Array.from(Array.from(bruto).map((c) => c.charCodeAt(0)));
}

const esIPhone = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const esAppInstalada = () =>
  (navigator as any).standalone === true || window.matchMedia("(display-mode: standalone)").matches;

export function NotificacionesBoton() {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<Estado>("cargando");
  const [trabajando, setTrabajando] = useState(false);

  async function revisarEstado() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      // En iPhone, esto casi siempre significa que la app no se agregó a la pantalla de inicio
      setEstado(esIPhone() && !esAppInstalada() ? "falta-instalar" : "no-soportado");
      return;
    }
    if (Notification.permission === "denied") return setEstado("bloqueadas");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setEstado(sub && Notification.permission === "granted" ? "activas" : "inactivas");
    } catch {
      setEstado("no-soportado");
    }
  }

  useEffect(() => { revisarEstado(); }, []);

  async function activar() {
    setTrabajando(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") { setEstado(permiso === "denied" ? "bloqueadas" : "inactivas"); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const { clave } = await (await fetch("/api/push/clave")).json();
      const sub = (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64AUint8(clave) }));
      const res = await fetch("/api/push/suscribir", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("No se pudo guardar el dispositivo");
      setEstado("activas");
      toast.success("Notificaciones activadas");
    } catch (e: any) {
      toast.error(e.message || "No se pudieron activar las notificaciones");
    } finally {
      setTrabajando(false);
    }
  }

  async function desactivar() {
    setTrabajando(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch(`/api/push/suscribir?endpoint=${encodeURIComponent(sub.endpoint)}`, { method: "DELETE" });
        await sub.unsubscribe();
      }
      setEstado("inactivas");
      toast.success("Notificaciones desactivadas en este dispositivo");
    } catch (e: any) {
      toast.error(e.message || "No se pudieron desactivar");
    } finally {
      setTrabajando(false);
    }
  }

  async function enviarPrueba() {
    setTrabajando(true);
    try {
      const res = await fetch("/api/push/prueba", { method: "POST" });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error || "No se pudo enviar");
      if (r.enviados > 0) toast.success("Notificación de prueba enviada");
      else toast.error("No hay dispositivos activos para esta cuenta");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTrabajando(false);
    }
  }

  const activas = estado === "activas";

  return (
    <>
      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setAbierto(true)} title="Notificaciones">
        {activas ? <Bell className="h-4 w-4 text-emerald-600" /> : <BellOff className="h-4 w-4 text-slate-500" />}
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Notificaciones</DialogTitle>
            <DialogDescription>Recibe avisos en este dispositivo cuando te asignen un pendiente.</DialogDescription>
          </DialogHeader>

          {estado === "cargando" && <p className="text-sm text-slate-500">Revisando…</p>}

          {estado === "falta-instalar" && (
            <div className="text-sm text-slate-700 space-y-2">
              <p><b>En iPhone, primero hay que instalar la app:</b></p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Abre esta página en <b>Safari</b>.</li>
                <li>Toca el botón <b>Compartir</b> (cuadro con flecha).</li>
                <li>Elige <b>Agregar a pantalla de inicio</b> y confirma.</li>
                <li>Abre la app desde su icono (no desde Safari) y vuelve aquí.</li>
              </ol>
            </div>
          )}

          {estado === "no-soportado" && (
            <p className="text-sm text-slate-700">Este navegador no permite notificaciones. Prueba con Safari (iPhone) o Chrome.</p>
          )}

          {estado === "bloqueadas" && (
            <p className="text-sm text-slate-700">
              Las notificaciones están bloqueadas. Actívalas desde los ajustes del dispositivo o del navegador y vuelve a intentar.
            </p>
          )}

          {estado === "inactivas" && (
            <Button onClick={activar} disabled={trabajando}>
              {trabajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />} Activar notificaciones
            </Button>
          )}

          {activas && (
            <div className="space-y-2">
              <p className="text-sm text-emerald-700">Las notificaciones están activas en este dispositivo.</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={enviarPrueba} disabled={trabajando}>Enviar prueba</Button>
                <Button variant="ghost" onClick={desactivar} disabled={trabajando}>Desactivar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

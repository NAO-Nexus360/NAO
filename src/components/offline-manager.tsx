"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EVENTO_OUTBOX } from "@/lib/offline/outbox";
import {
  contarCambiosPendientes, EVENTO_SINCRONIZADO, precargarPantallas, sincronizarAhora, verificarUsuarioLocal,
} from "@/lib/offline/cliente";

// Registra el service worker, guarda las pantallas para uso sin conexión, envía los cambios
// hechos sin señal y muestra el estado de la conexión.
export function OfflineManager({ usuarioId }: { usuarioId: string }) {
  const router = useRouter();
  const [enLinea, setEnLinea] = useState(true);
  const [pendientes, setPendientes] = useState(0);
  const [enviando, setEnviando] = useState(false);

  const contar = useCallback(async () => {
    try { setPendientes(await contarCambiosPendientes()); } catch { /* sin almacenamiento */ }
  }, []);

  const enviar = useCallback(async () => {
    if (!navigator.onLine) return;
    setEnviando(true);
    try {
      const r = await sincronizarAhora();
      if (!r) return;
      if (r.enviados > 0) toast.success(`${r.enviados} ${r.enviados === 1 ? "cambio enviado" : "cambios enviados"}`);
      r.conflictos.forEach((t) =>
        toast.warning(`"${t}" ya había cambiado mientras no tenías conexión. Se aplicó tu cambio.`, { duration: 9000 })
      );
      r.errores.forEach((e) => toast.error(e, { duration: 9000 }));
      if (r.enviados > 0 || r.errores.length > 0) router.refresh();
    } finally {
      setEnviando(false);
      contar();
    }
  }, [router, contar]);

  useEffect(() => {
    setEnLinea(navigator.onLine);
    verificarUsuarioLocal(usuarioId).then(contar);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    const alConectar = () => { setEnLinea(true); enviar(); };
    const alDesconectar = () => setEnLinea(false);
    const alVolver = () => { if (document.visibilityState === "visible") { contar().then(() => enviar()); } };
    window.addEventListener("online", alConectar);
    window.addEventListener("offline", alDesconectar);
    window.addEventListener(EVENTO_OUTBOX, contar);
    document.addEventListener("visibilitychange", alVolver);

    // Al abrir con internet: enviar lo pendiente y guardar las pantallas (sin estorbar la carga)
    enviar();
    const inactivo = (window as any).requestIdleCallback
      ? (window as any).requestIdleCallback(() => precargarPantallas().catch(() => {}), { timeout: 8000 })
      : window.setTimeout(() => precargarPantallas().catch(() => {}), 4000);

    return () => {
      window.removeEventListener("online", alConectar);
      window.removeEventListener("offline", alDesconectar);
      window.removeEventListener(EVENTO_OUTBOX, contar);
      document.removeEventListener("visibilitychange", alVolver);
      if ((window as any).cancelIdleCallback) (window as any).cancelIdleCallback(inactivo);
      else window.clearTimeout(inactivo);
    };
  }, [usuarioId, contar, enviar]);

  useEffect(() => {
    const alSincronizar = () => contar();
    window.addEventListener(EVENTO_SINCRONIZADO, alSincronizar);
    return () => window.removeEventListener(EVENTO_SINCRONIZADO, alSincronizar);
  }, [contar]);

  if (enLinea && pendientes === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 px-4 py-2 text-sm ${enLinea ? "bg-blue-50 text-blue-800 border-b border-blue-200" : "bg-amber-50 text-amber-900 border-b border-amber-200"}`}>
      {!enLinea && <CloudOff className="h-4 w-4 shrink-0" />}
      <span className="flex-1 min-w-0">
        {!enLinea
          ? `Sin conexión. Puedes consultar y modificar pendientes; los cambios se enviarán al reconectarte.${pendientes > 0 ? ` (${pendientes} por enviar)` : ""}`
          : `${pendientes} ${pendientes === 1 ? "cambio por enviar" : "cambios por enviar"}.`}
      </span>
      {enLinea && pendientes > 0 && (
        <Button size="sm" variant="outline" onClick={enviar} disabled={enviando}>
          <RefreshCw className={`h-3.5 w-3.5 ${enviando ? "animate-spin" : ""}`} /> Enviar ahora
        </Button>
      )}
    </div>
  );
}

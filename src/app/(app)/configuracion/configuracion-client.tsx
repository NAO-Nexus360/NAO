"use client";
import { useState } from "react";
import { BellRing, Settings, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificacionesPanel } from "@/components/notificaciones-panel";
import { GuiaInstalacionDialog } from "@/components/guia-instalacion";
import { cn } from "@/lib/utils";

const SUGERIDOS = [0, 1, 2, 3, 5, 7];
const formatoHora = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "a. m." : "p. m."}`;
const etiqueta = (d: number) => (d === 0 ? "El mismo día" : d === 1 ? "1 día antes" : `${d} días antes`);

export function ConfiguracionClient({ diasIniciales, horaInicial }: { diasIniciales: number[]; horaInicial: number }) {
  const [dias, setDias] = useState<number[]>([...diasIniciales].sort((a, b) => a - b));
  const [otro, setOtro] = useState("");
  const [hora, setHora] = useState<number>(horaInicial);
  const [guardando, setGuardando] = useState(false);
  const [guiaAbierta, setGuiaAbierta] = useState(false);

  const alternar = (d: number) =>
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));

  function agregarOtro() {
    const n = Number(otro);
    if (!Number.isInteger(n) || n < 0 || n > 30) { toast.error("Escribe un número de 0 a 30"); return; }
    if (!dias.includes(n)) setDias((prev) => [...prev, n].sort((a, b) => a - b));
    setOtro("");
  }

  async function guardar() {
    if (dias.length > 8) { toast.error("Máximo 8 opciones"); return; }
    setGuardando(true);
    try {
      const res = await fetch("/api/configuracion/recordatorios", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dias, hora }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setDias(data.dias);
      setHora(data.hora);
      toast.success(data.dias.length ? "Recordatorios guardados" : "Recordatorios desactivados");
    } catch (e: any) { toast.error(e.message); } finally { setGuardando(false); }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings className="h-6 w-6 text-slate-500" /> Configuración
        </h1>
        <p className="text-sm text-slate-500 mt-1">Ajustes personales de tu cuenta.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Instalar la app en tu teléfono</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Agrégala a la pantalla de inicio para abrirla como una app y recibir notificaciones.</p>
          <Button variant="outline" onClick={() => setGuiaAbierta(true)}>Ver instrucciones</Button>
          <GuiaInstalacionDialog open={guiaAbierta} onOpenChange={setGuiaAbierta} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notificaciones en este dispositivo</CardTitle></CardHeader>
        <CardContent><NotificacionesPanel /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><BellRing className="h-4 w-4 text-blue-600" /> Recordatorios de vencimiento</CardTitle>
          <p className="text-xs text-slate-500">
            Elige cuántos días antes de la fecha de entrega quieres recibir un aviso. Solo aplica a pendientes abiertos
            que tienes como responsable o que son de tu empresa contratista. El aviso llega a la hora que elijas (hora de México); puede tardar unos minutos.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {SUGERIDOS.map((d) => (
              <Button key={d} size="sm" variant={dias.includes(d) ? "default" : "outline"} onClick={() => alternar(d)}>
                {etiqueta(d)}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Input type="number" min={0} max={30} value={otro} onChange={(e) => setOtro(e.target.value)}
              placeholder="Otro número de días" className="w-48" onKeyDown={(e) => e.key === "Enter" && agregarOtro()} />
            <Button size="sm" variant="outline" onClick={agregarOtro}>Agregar</Button>
          </div>

          {dias.filter((d) => !SUGERIDOS.includes(d)).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dias.filter((d) => !SUGERIDOS.includes(d)).map((d) => (
                <span key={d} className={cn("inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700")}>
                  {etiqueta(d)}
                  <button type="button" onClick={() => alternar(d)} aria-label="Quitar"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <label htmlFor="hora-recordatorio" className="text-sm text-slate-700">Hora del aviso:</label>
            <select id="hora-recordatorio" value={hora} onChange={(e) => setHora(Number(e.target.value))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm">
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{formatoHora(h)}</option>
              ))}
            </select>
          </div>

          <p className="text-sm text-slate-600">
            {dias.length === 0 ? "No recibirás recordatorios." : `Recibirás aviso: ${dias.map(etiqueta).join(", ").toLowerCase()}, a las ${formatoHora(hora)}.`}
          </p>
          <Button onClick={guardar} disabled={guardando}>
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
          </Button>
          <p className="text-xs text-slate-500">Para recibir los avisos en el teléfono, activa las notificaciones en la tarjeta de arriba.</p>
        </CardContent>
      </Card>
    </div>
  );
}

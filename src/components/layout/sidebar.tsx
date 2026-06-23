"use client";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  LayoutDashboard, ListChecks, FileText, BookOpen, Building2, ChevronRight,
  Folder, Users, Briefcase, ChevronDown, X, Building, MapPin, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Session } from "next-auth";

export function Sidebar({
  user,
  obras,
  mobileOpen,
  onMobileClose,
}: {
  user: Session["user"];
  obras: any[];
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const params = useParams<{ obraId?: string }>();
  const obraId = params.obraId;
  const obraActual = obras.find((o) => o.id === obraId);
  const [obraSwitcherOpen, setObraSwitcherOpen] = useState(false);

  const isSupervisor = user.role === "SUPERVISOR";

  const obraItems = obraId ? [
    { href: `/obras/${obraId}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `/obras/${obraId}/pendientes`, label: "Pendientes", icon: ListChecks },
    { href: `/obras/${obraId}/contratistas`, label: "Contratistas", icon: Briefcase },
    { href: `/obras/${obraId}/metas`, label: "Metas", icon: Target },
    { href: `/obras/${obraId}/minutas`, label: "Minutas", icon: FileText },
    { href: `/obras/${obraId}/bitacora`, label: "Bitácora", icon: BookOpen },
  ] : [];

  const adminItems = isSupervisor ? [
    { href: "/admin/obras", label: "Obras", icon: Building },
    { href: "/admin/usuarios", label: "Usuarios", icon: Users },
    { href: "/admin/contratistas", label: "Contratistas", icon: Briefcase },
  ] : [];

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 flex-col bg-slate-900 text-slate-100 border-r border-slate-800 flex transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800 shrink-0">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm leading-tight">NAO</div>
            <div className="text-[11px] text-slate-400 leading-tight">Nexus Avance de Obra</div>
          </div>
          <button onClick={onMobileClose} className="lg:hidden text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Obra selector */}
        <div className="p-3 border-b border-slate-800">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-2 mb-2">Obra</div>
          {obras.length === 0 ? (
            <div className="text-xs text-slate-400 px-2 py-3">Sin obras asignadas</div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setObraSwitcherOpen((v) => !v)}
                className="w-full flex items-center gap-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition px-3 py-2.5 text-left"
              >
                <Folder className="h-4 w-4 text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{obraActual ? obraActual.nombre : "Selecciona obra"}</div>
                  {obraActual?.direccion && (
                    <div className="text-[10px] text-slate-400 truncate flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" /> {obraActual.direccion}
                    </div>
                  )}
                </div>
                <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", obraSwitcherOpen && "rotate-180")} />
              </button>

              {obraSwitcherOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden">
                  {obras.map((o) => (
                    <Link
                      key={o.id}
                      href={`/obras/${o.id}/dashboard`}
                      onClick={() => { setObraSwitcherOpen(false); onMobileClose(); }}
                      className={cn(
                        "block px-3 py-2 text-sm hover:bg-slate-700 transition",
                        o.id === obraId && "bg-slate-700/50"
                      )}
                    >
                      <div className="font-medium">{o.nombre}</div>
                      {o.direccion && <div className="text-[10px] text-slate-400 truncate">{o.direccion}</div>}
                    </Link>
                  ))}
                  <Link
                    href="/obras"
                    onClick={() => { setObraSwitcherOpen(false); onMobileClose(); }}
                    className="block px-3 py-2 text-xs text-blue-400 hover:bg-slate-700 transition border-t border-slate-700"
                  >
                    Ver todas las obras →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {obraId && (
            <>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3 mb-2">Esta obra</div>
              {obraItems.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      "group flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                      active ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className={cn("h-4 w-4", active && "text-blue-400")} />
                      {item.label}
                    </span>
                    <ChevronRight className={cn("h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all", active && "opacity-100 translate-x-0")} />
                  </Link>
                );
              })}
            </>
          )}

          {isSupervisor && (
            <>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-3 mb-2 mt-6">Administración</div>
              {adminItems.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                      active ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active && "text-blue-400")} />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800 shrink-0">
          <Link href="/obras" onClick={onMobileClose} className="text-xs text-slate-400 hover:text-white transition flex items-center gap-2">
            <Folder className="h-3.5 w-3.5" /> Todas mis obras ({obras.length})
          </Link>
        </div>
      </aside>
    </>
  );
}

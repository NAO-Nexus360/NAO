import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function isOverdue(fechaEntrega: Date | string, estatus?: string) {
  if (estatus === "COMPLETADO" || estatus === "CANCELADO") return false;
  const d = typeof fechaEntrega === "string" ? new Date(fechaEntrega) : fechaEntrega;
  return d.getTime() < new Date().setHours(0, 0, 0, 0);
}

export function diasRestantes(fechaEntrega: Date | string) {
  const d = typeof fechaEntrega === "string" ? new Date(fechaEntrega) : fechaEntrega;
  const diff = d.getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

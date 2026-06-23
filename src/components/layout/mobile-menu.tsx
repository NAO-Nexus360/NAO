"use client";
import { Menu } from "lucide-react";

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden h-9 w-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
      aria-label="Abrir menú"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}

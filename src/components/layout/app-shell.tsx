"use client";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileMenuButton } from "./mobile-menu";
import type { Session } from "next-auth";

export function AppShell({
  user,
  obras,
  children,
}: {
  user: Session["user"];
  obras: any[];
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar user={user} obras={obras} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={user} leftSlot={<MobileMenuButton onClick={() => setMobileOpen(true)} />} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-[1600px] mx-auto animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

"use client";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon } from "lucide-react";
import type { Session } from "next-auth";
import { ROLE_LABEL } from "@/lib/auth";

const roleBadge: Record<string, string> = {
  SUPERVISOR: "bg-purple-100 text-purple-700",
  RESIDENTE: "bg-blue-100 text-blue-700",
  CONTRATISTA: "bg-emerald-100 text-emerald-700",
};

function initials(name?: string | null) {
  if (!name) return "U";
  return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

export function Topbar({ user, leftSlot }: { user: Session["user"]; leftSlot?: React.ReactNode }) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {leftSlot}
        <div className="hidden md:block min-w-0">
          <h2 className="text-xs font-medium text-slate-500">Bienvenido,</h2>
          <p className="text-base font-semibold text-slate-900 leading-tight truncate">{user.name}</p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 rounded-full p-1 hover:bg-slate-50 transition-colors outline-none focus:ring-2 focus:ring-slate-300">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium leading-tight">{user.name}</p>
            <p className="text-xs text-slate-500 leading-tight">{ROLE_LABEL[user.role]}</p>
          </div>
          <Avatar>
            <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-900 text-white">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-1">
              <span>{user.name}</span>
              <span className="text-xs font-normal text-slate-500">{user.email}</span>
              <Badge className={"w-fit mt-1 text-[10px] " + (roleBadge[user.role] ?? "bg-slate-100 text-slate-700")}>
                {ROLE_LABEL[user.role]}
              </Badge>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

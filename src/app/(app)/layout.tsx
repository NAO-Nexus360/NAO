import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { getUserObras } from "@/lib/access";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const obras = await getUserObras(session.user.id);

  return (
    <AppShell user={session.user} obras={obras as any}>
      {children}
    </AppShell>
  );
}

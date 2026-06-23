import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email.toLowerCase() } });
        if (!user || !user.password || !user.activo) return null;
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;
        return {
          id: user.id, email: user.email, name: user.name, image: user.image,
          role: user.role, puesto: user.puesto, contratistaId: user.contratistaId,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.puesto = (user as any).puesto;
        token.contratistaId = (user as any).contratistaId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).puesto = token.puesto;
        (session.user as any).contratistaId = token.contratistaId;
      }
      return session;
    },
  },
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
      puesto?: string | null;
      contratistaId?: string | null;
    };
  }
}

// Helpers de permisos
export const ROLE_LABEL: Record<Role, string> = {
  SUPERVISOR: "Supervisor",
  RESIDENTE: "Residente",
  CONTRATISTA: "Contratista",
};

export function puedeCompletar(role: Role) {
  return role === "SUPERVISOR";
}
export function puedeEditarPendiente(role: Role) {
  return role === "SUPERVISOR" || role === "RESIDENTE";
}
export function puedeAdministrar(role: Role) {
  return role === "SUPERVISOR";
}
export function soloLectura(role: Role) {
  return role === "CONTRATISTA";
}

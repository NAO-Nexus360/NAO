export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/obras/:path*",
    "/admin/:path*",
    "/api/obras/:path*",
    "/api/pendientes/:path*",
    "/api/minutas/:path*",
    "/api/bitacora/:path*",
    "/api/usuarios/:path*",
    "/api/contratistas/:path*",
    "/api/upload",
  ],
};

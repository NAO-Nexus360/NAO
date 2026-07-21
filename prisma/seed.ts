import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * SEED DE PRODUCCIÓN — NAO
 *
 * 1. Borra TODOS los datos existentes (demo o anteriores).
 * 2. Crea únicamente el usuario administrador: Daniel Jasqui (Supervisor).
 *
 * Después de correrlo, Daniel puede crear obras, usuarios y contratistas
 * reales desde el panel de Administración dentro del sistema.
 */
async function main() {
  console.log("🧹 Limpiando TODOS los datos existentes...");

  // Orden correcto para respetar llaves foráneas
  await prisma.evidencia.deleteMany();
  await prisma.comentario.deleteMany();
  await prisma.programaObra.deleteMany();
  await prisma.meta.deleteMany();
  await prisma.pendiente.deleteMany();
  await prisma.bitacoraEntry.deleteMany();
  await prisma.minuta.deleteMany();
  await prisma.obraContratista.deleteMany();
  await prisma.obraUser.deleteMany();
  await prisma.obra.deleteMany();
  await prisma.contratista.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ Base de datos limpia.");
  console.log("👤 Creando usuario administrador...");

  const hash = await bcrypt.hash("Danielja1208", 10);

  await prisma.user.create({
    data: {
      email: "danieljasqui@gmail.com",
      name: "Daniel Jasqui",
      password: hash,
      role: Role.SUPERVISOR,
      puesto: "Administrador",
    },
  });

  console.log("");
  console.log("✅ Listo. Usuario único del sistema:");
  console.log("   📧 danieljasqui@gmail.com  (rol: Supervisor)");
  console.log("");
  console.log("Entra al sistema y crea tus obras, usuarios y contratistas");
  console.log("reales desde Administración.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

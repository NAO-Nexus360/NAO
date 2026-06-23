import { PrismaClient, Role, Area, Prioridad, Estatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding NAO...");

  const hash = await bcrypt.hash("password123", 10);

  // --- Usuarios ---
  const supervisor = await prisma.user.upsert({
    where: { email: "supervisor@nexus360.mx" },
    update: {},
    create: {
      email: "supervisor@nexus360.mx",
      name: "Carlos Mendoza",
      password: hash,
      role: Role.SUPERVISOR,
      puesto: "Supervisor de Obra",
      telefono: "+52 55 1234 5678",
    },
  });

  const residente = await prisma.user.upsert({
    where: { email: "residente@nexus360.mx" },
    update: {},
    create: {
      email: "residente@nexus360.mx",
      name: "Ana García",
      password: hash,
      role: Role.RESIDENTE,
      puesto: "Residente de Obra",
      telefono: "+52 55 2345 6789",
    },
  });

  // --- Contratistas (empresas) ---
  const c1 = await prisma.contratista.upsert({
    where: { id: "seed-c1" },
    update: {},
    create: { id: "seed-c1", nombre: "Constructora del Norte", empresa: "CDN SA de CV", telefono: "+52 55 3456 7890", email: "contacto@cdn.mx" },
  });
  const c2 = await prisma.contratista.upsert({
    where: { id: "seed-c2" },
    update: {},
    create: { id: "seed-c2", nombre: "Instalaciones MEP", empresa: "MEP Group", telefono: "+52 55 4567 8901", email: "info@mep.mx" },
  });
  const c3 = await prisma.contratista.upsert({
    where: { id: "seed-c3" },
    update: {},
    create: { id: "seed-c3", nombre: "Acabados Premium", empresa: "AP Constructora", telefono: "+52 55 5678 9012", email: "ventas@ap.mx" },
  });

  // Usuario contratista vinculado
  const userContratista = await prisma.user.upsert({
    where: { email: "contratista@nexus360.mx" },
    update: {},
    create: {
      email: "contratista@nexus360.mx",
      name: "Luis Ramírez",
      password: hash,
      role: Role.CONTRATISTA,
      puesto: "Contratista",
      telefono: "+52 55 6789 0123",
      contratistaId: c1.id,
    },
  });

  // --- Obras ---
  const obra1 = await prisma.obra.upsert({
    where: { id: "obra-1" },
    update: {},
    create: {
      id: "obra-1",
      nombre: "Torre Residencial Norte",
      direccion: "Av. Universidad 1234, Coyoacán, CDMX",
      fechaInicio: new Date("2026-01-15"),
      fechaFinEstimada: new Date("2027-06-30"),
      creadoPorId: supervisor.id,
    },
  });

  const obra2 = await prisma.obra.upsert({
    where: { id: "obra-2" },
    update: {},
    create: {
      id: "obra-2",
      nombre: "Plaza Comercial Sur",
      direccion: "Periférico Sur 5500, Tlalpan, CDMX",
      fechaInicio: new Date("2026-03-01"),
      fechaFinEstimada: new Date("2027-12-31"),
      creadoPorId: supervisor.id,
    },
  });

  // Asignaciones a obras
  await prisma.obraUser.createMany({
    skipDuplicates: true,
    data: [
      { obraId: obra1.id, userId: supervisor.id },
      { obraId: obra2.id, userId: supervisor.id },
      { obraId: obra1.id, userId: residente.id },
      { obraId: obra1.id, userId: userContratista.id }, // solo obra 1
    ],
  });

  await prisma.obraContratista.createMany({
    skipDuplicates: true,
    data: [
      { obraId: obra1.id, contratistaId: c1.id },
      { obraId: obra1.id, contratistaId: c2.id },
      { obraId: obra1.id, contratistaId: c3.id },
      { obraId: obra2.id, contratistaId: c1.id },
    ],
  });

  // --- Pendientes en Obra 1 ---
  const hoy = new Date();
  const dia = (n: number) => { const d = new Date(hoy); d.setDate(d.getDate() + n); return d; };

  await prisma.pendiente.createMany({
    data: [
      {
        tarea: "Colado de losa Nivel 3 zona A",
        descripcion: "Coordinar bomba de concreto y cuadrilla.",
        area: Area.ESTRUCTURA, prioridad: Prioridad.ALTA, estatus: Estatus.EN_PROGRESO, avance: 60,
        fechaInicio: dia(-2), fechaEntrega: dia(3),
        obraId: obra1.id, contratistaId: c1.id, responsableId: residente.id, supervisorId: supervisor.id, creadorId: supervisor.id,
      },
      {
        tarea: "Pruebas hidráulicas Nivel 2",
        descripcion: "Antes de cierre de muros.",
        area: Area.INSTALACIONES, prioridad: Prioridad.CRITICA, estatus: Estatus.PENDIENTE, avance: 0,
        fechaInicio: dia(-7), fechaEntrega: dia(-2),
        obraId: obra1.id, contratistaId: c2.id, responsableId: residente.id, creadorId: supervisor.id,
      },
      {
        tarea: "Aplicación de yeso muros - Depto 201",
        area: Area.ACABADOS, prioridad: Prioridad.MEDIA, estatus: Estatus.COMPLETADO, avance: 100,
        fechaInicio: dia(-10), fechaEntrega: dia(-2), fechaCompletado: dia(-1), completadoPorId: supervisor.id,
        obraId: obra1.id, contratistaId: c3.id, responsableId: residente.id, creadorId: residente.id,
      },
      {
        tarea: "Trámite permiso uso de suelo",
        observaciones: "Falta firma del DRO",
        area: Area.ADMINISTRATIVO, prioridad: Prioridad.ALTA, estatus: Estatus.EN_REVISION, avance: 80,
        fechaInicio: dia(0), fechaEntrega: dia(7),
        obraId: obra1.id, responsableId: supervisor.id, creadorId: supervisor.id,
      },
      {
        tarea: "Cimbrado columnas eje 4-7",
        area: Area.ESTRUCTURA, prioridad: Prioridad.ALTA, estatus: Estatus.EN_PROGRESO, avance: 40,
        fechaInicio: dia(0), fechaEntrega: dia(7),
        obraId: obra1.id, contratistaId: c1.id, responsableId: residente.id, creadorId: supervisor.id,
      },
      {
        tarea: "Pruebas eléctricas tablero principal",
        area: Area.INSTALACIONES, prioridad: Prioridad.CRITICA, estatus: Estatus.PENDIENTE, avance: 0,
        fechaInicio: dia(-2), fechaEntrega: dia(3),
        obraId: obra1.id, contratistaId: c2.id, responsableId: residente.id, creadorId: supervisor.id,
      },
    ],
  });

  // --- Pendientes en Obra 2 ---
  await prisma.pendiente.createMany({
    data: [
      {
        tarea: "Excavación y cimentación zona comercial",
        area: Area.OBRA_CIVIL, prioridad: Prioridad.ALTA, estatus: Estatus.EN_PROGRESO, avance: 30,
        fechaInicio: dia(0), fechaEntrega: dia(14),
        obraId: obra2.id, contratistaId: c1.id, creadorId: supervisor.id,
      },
      {
        tarea: "Levantamiento topográfico final",
        area: Area.PROYECTO, prioridad: Prioridad.MEDIA, estatus: Estatus.COMPLETADO, avance: 100,
        fechaInicio: dia(-12), fechaEntrega: dia(-5), fechaCompletado: dia(-4), completadoPorId: supervisor.id,
        obraId: obra2.id, creadorId: supervisor.id,
      },
      {
        tarea: "Plan de comercialización locales planta baja",
        area: Area.VENTA, prioridad: Prioridad.MEDIA, estatus: Estatus.PENDIENTE, avance: 0,
        fechaInicio: dia(5), fechaEntrega: dia(20),
        obraId: obra2.id, responsableId: supervisor.id, creadorId: supervisor.id,
      },
    ],
  });

  // --- Minuta ejemplo ---
  await prisma.minuta.create({
    data: {
      titulo: "Junta semanal — Torre Norte semana 8",
      contenido: "Se concluyó colado parcial de losa N2 zona B.\n\nPendientes:\n- Ana coordinará colado N3 zona A para el viernes\n- Luis (CDN) entrega cimbrado de columnas eje 4-7 próxima semana\n- MEP debe completar pruebas hidráulicas URGENTE antes de cierre de muros\n\nObservaciones del director:\n- Reforzar acero en trabe T-12 antes de colar",
      obraId: obra1.id,
      subidoPorId: residente.id,
    },
  });

  // --- Bitácora ---
  await prisma.bitacoraEntry.create({
    data: {
      titulo: "Avance general — semana 8",
      contenido: "Se concluyó colado parcial de losa N2 zona B. Personal completo. Clima despejado.",
      avance: 42, clima: "Despejado", personal: 38,
      obraId: obra1.id, autorId: residente.id,
    },
  });

  // --- Metas (programa de obra por contratista) ---
  await prisma.meta.createMany({
    data: [
      // Constructora del Norte (estructura) en Obra 1
      {
        obraId: obra1.id, contratistaId: c1.id, creadorId: supervisor.id,
        nombre: "Iniciar cimentación",
        fechaInicioPlaneada: dia(-60), fechaFinPlaneada: dia(-55),
        fechaReal: dia(-58), // a tiempo
      },
      {
        obraId: obra1.id, contratistaId: c1.id, creadorId: supervisor.id,
        nombre: "Terminar cimentación",
        fechaInicioPlaneada: dia(-55), fechaFinPlaneada: dia(-25),
        fechaReal: dia(-20), // 5 días tarde
        notas: "Hubo retraso por lluvia en semana 3",
      },
      {
        obraId: obra1.id, contratistaId: c1.id, creadorId: supervisor.id,
        nombre: "Iniciar estructura Nivel 1",
        fechaInicioPlaneada: dia(-20), fechaFinPlaneada: dia(-15),
        fechaReal: dia(-18),
      },
      {
        obraId: obra1.id, contratistaId: c1.id, creadorId: supervisor.id,
        nombre: "Terminar estructura Nivel 1",
        fechaInicioPlaneada: dia(-15), fechaFinPlaneada: dia(-3),
        fechaReal: null, // vencida
      },
      {
        obraId: obra1.id, contratistaId: c1.id, creadorId: supervisor.id,
        nombre: "Iniciar estructura Nivel 2",
        fechaInicioPlaneada: dia(-2), fechaFinPlaneada: dia(20),
        fechaReal: null, // en curso
      },
      {
        obraId: obra1.id, contratistaId: c1.id, creadorId: supervisor.id,
        nombre: "Terminar estructura Nivel 3",
        fechaInicioPlaneada: dia(45), fechaFinPlaneada: dia(75),
        fechaReal: null, // próxima
      },
      // Instalaciones MEP en Obra 1
      {
        obraId: obra1.id, contratistaId: c2.id, creadorId: supervisor.id,
        nombre: "Instalaciones hidráulicas Nivel 1",
        fechaInicioPlaneada: dia(-10), fechaFinPlaneada: dia(5),
        fechaReal: null,
      },
      {
        obraId: obra1.id, contratistaId: c2.id, creadorId: supervisor.id,
        nombre: "Instalaciones eléctricas Nivel 1",
        fechaInicioPlaneada: dia(5), fechaFinPlaneada: dia(25),
        fechaReal: null,
      },
      // Acabados Premium en Obra 1
      {
        obraId: obra1.id, contratistaId: c3.id, creadorId: supervisor.id,
        nombre: "Acabados departamentos 101-105",
        fechaInicioPlaneada: dia(30), fechaFinPlaneada: dia(90),
        fechaReal: null,
      },
    ],
  });

  console.log("✅ NAO seed completado");
  console.log("");
  console.log("👤 Cuentas de prueba (password: password123):");
  console.log("   👷 Supervisor (ve todo, da check completado):");
  console.log("      → supervisor@nexus360.mx");
  console.log("   📋 Residente (crea/edita pero no completa):");
  console.log("      → residente@nexus360.mx");
  console.log("   🔍 Contratista (solo lectura, solo Obra 1):");
  console.log("      → contratista@nexus360.mx");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

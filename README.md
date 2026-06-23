# 🏗️ NAO — Nexus Avance de Obra

Sistema profesional de control de obra de **Nexus 360**. Plataforma multi-obra para
supervisores, contratistas responsables y contratistas, con permisos por rol.

## Stack

- **Frontend**: Next.js 14 · React 18 · TypeScript · TailwindCSS · shadcn/ui
- **Backend**: Next.js API Routes
- **DB**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth (credenciales) con bcrypt
- **Storage**: Cloudinary (fotos y archivos)
- **Idioma**: español (México)

## Funcionalidades (Entrega 1 — Núcleo)

- ✅ Login con 3 roles: Supervisor, Contratista Responsable, Contratista
- ✅ Multi-obra: cada usuario solo ve sus obras asignadas
- ✅ Dashboard por obra con KPIs, gráficas y avance general
- ✅ Pendientes con las 9 áreas (Estructura, Obra civil, Obra blanca,
  Instalaciones, Acabados, Proyecto, Administrativo, Venta, Postventa)
- ✅ Solo Supervisor puede marcar tareas como Completado
- ✅ Minutas manuales (texto + archivo opcional)
- ✅ Bitácora de avances con fotos
- ✅ Administración de obras, usuarios y contratistas
- ✅ Diseño responsive (computadora y celular)

### Próximas entregas

- **Entrega 2**: programa de obra (Excel/PDF) con alertas de atraso, notificaciones por correo.
- **Entrega 3**: deploy a producción, manual final, opcionalmente WhatsApp.

## Instalación

### Requisitos

- Node.js 20+
- PostgreSQL 14+
- Cuenta gratis en Cloudinary

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables
cp .env.example .env
# Edita .env con tu DATABASE_URL, NEXTAUTH_SECRET y credenciales Cloudinary

# 3. Crear las tablas + datos de prueba
npx prisma db push
npm run db:seed

# 4. Arrancar
npm run dev
```

Abre `http://localhost:3000`.

### Cuentas iniciales (después del seed)

Todas con contraseña `password123`:

- `supervisor@nexus360.mx` — Supervisor (ve todo, único que da check de Completado)
- `responsable@nexus360.mx` — Contratista Responsable (crea/edita)
- `contratista@nexus360.mx` — Contratista (solo lectura)

### Generar NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

### Cloudinary (gratis hasta 25 GB)

1. Crea cuenta en https://cloudinary.com
2. En el Dashboard copia: Cloud Name, API Key, API Secret
3. Pégalos en tu `.env`

## Despliegue a producción (próximo paso)

Vercel + Neon (PostgreSQL serverless). Te acompañaré paso a paso cuando llegue
el momento.

## Estructura

```
src/
├── app/
│   ├── (auth)/login              ← Inicio de sesión
│   ├── (app)/
│   │   ├── obras                 ← Mis obras
│   │   ├── obras/[obraId]/
│   │   │   ├── dashboard         ← Dashboard de la obra
│   │   │   ├── pendientes        ← Tabla de pendientes
│   │   │   ├── minutas           ← Minutas
│   │   │   └── bitacora          ← Bitácora
│   │   └── admin/
│   │       ├── obras             ← Gestionar obras
│   │       ├── usuarios          ← Gestionar usuarios
│   │       └── contratistas      ← Gestionar contratistas
│   └── api/                      ← Endpoints REST
├── components/                   ← UI y formularios
├── lib/                          ← Prisma, auth, helpers
└── middleware.ts                 ← Protección de rutas

prisma/
├── schema.prisma                 ← Modelo de datos
└── seed.ts                       ← Datos iniciales
```

## Permisos resumidos

| Acción | Supervisor | Cont. Responsable | Contratista |
|---|:-:|:-:|:-:|
| Ver tareas | ✅ todas | ✅ todas | ✅ solo suyas |
| Crear pendiente | ✅ | ✅ | ❌ |
| Editar pendiente | ✅ | ✅ | ❌ |
| Mover avance 0→100% | ✅ | ✅ | ❌ |
| Marcar COMPLETADO | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ |
| Crear minutas | ✅ | ✅ | ❌ |
| Bitácora | ✅ | ✅ | 👁️ ver |
| Admin obras | ✅ | ❌ | ❌ |
| Admin usuarios | ✅ | ❌ | ❌ |
| Admin contratistas | ✅ | ❌ | ❌ |

Si un Contratista Responsable pone una tarea al 100%, automáticamente pasa a "En revisión"
hasta que un Supervisor la apruebe (botón "Aprobar" verde).

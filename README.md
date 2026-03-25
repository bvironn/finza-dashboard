# Finza — Dashboard Financiero

Dashboard de gestión financiera personal y empresarial con soporte multiusuario, permisos granulares y análisis detallado.

## Stack

- **Astro** (SSR) + **React** (islands) + **TypeScript**
- **shadcn/ui** (Radix UI) + **Tailwind CSS v4**
- **Drizzle ORM** + **MariaDB**
- **Bun** como runtime y package manager

## Requisitos

- [Bun](https://bun.sh) >= 1.0
- MariaDB 11+

## Instalación

```bash
bun install
```

## Variables de entorno

Copia `.env.example` a `.env` y configura:

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=finza
JWT_SECRET=cambia-esto-en-produccion
```

## Base de datos

```bash
# Ejecutar migraciones
bun run db:migrate

# Crear usuario administrador
bun run db:create-admin
# Opcional: bun run db:create-admin email@ejemplo.com mipassword "Mi Nombre"
```

## Desarrollo

```bash
bun run dev
```

Abre `http://localhost:4321` en el navegador.

## Build y producción

```bash
bun run build
node dist/server/entry.mjs
```

## Docker

### Solo MariaDB (desarrollo)

```bash
docker compose up -d
```

### Producción (app + MariaDB)

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Scripts

| Comando | Descripción |
|---|---|
| `bun run dev` | Servidor de desarrollo |
| `bun run build` | Build de producción |
| `bun run preview` | Preview del build |
| `bun run db:migrate` | Ejecutar migraciones |
| `bun run db:create-admin` | Crear usuario admin |
| `bun run lint` | Ejecutar ESLint |
| `bun run format` | Formatear código |
| `bun run typecheck` | Verificar tipos |

## Estructura del proyecto

```
src/
├── components/
│   ├── ui/              # shadcn/ui
│   ├── common/          # Shell, Sidebar, Header, Providers
│   ├── auth/            # Login
│   ├── dashboard/       # Dashboard, Charts
│   ├── transacciones/   # CRUD transacciones
│   ├── catalogo/        # Categorías, Subcategorías, Entidades
│   ├── gastos-fijos/    # Gastos recurrentes
│   ├── ingresos-fijos/  # Ingresos recurrentes
│   └── configuracion/   # Config, Sub-usuarios, Usuarios admin
├── layouts/             # Layout Astro
├── pages/
│   ├── *.astro          # Páginas (file-based routing)
│   └── api/             # API endpoints
├── lib/
│   ├── db/              # Schema Drizzle, conexión, migraciones
│   ├── validations/     # Schemas Zod
│   ├── auth.ts          # JWT + bcrypt
│   ├── middleware.ts     # Auth helpers para API routes
│   ├── calculos.ts      # Lógica financiera
│   ├── api.ts           # Cliente HTTP (frontend)
│   ├── auth-context.tsx  # Context de autenticación
│   └── periodo-context.tsx # Context de período (año/mes)
├── types/               # Interfaces TypeScript
├── config/              # Constantes
└── styles/              # CSS global
```

## Funcionalidades

- **Autenticación** — JWT con roles (Admin, User, Sub-user)
- **Dashboard** — KPIs, gráficos de barras/línea, resumen mensual, desglose
- **Transacciones** — CRUD con filtros, paginación, búsqueda
- **Catálogo** — Categorías, subcategorías y entidades personalizables
- **Gastos/Ingresos fijos** — Con proyección automática a meses futuros
- **Configuración** — Año fiscal, IVA, moneda, tema claro/oscuro
- **Multi-usuario** — Sub-usuarios con 12 permisos granulares
- **Backup** — Export/import JSON de todos los datos

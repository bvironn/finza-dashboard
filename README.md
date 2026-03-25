# Finza

Dashboard de finanzas personal/empresarial. Reemplaza un libro de Excel de contabilidad anual por una aplicacion web completa con autenticacion, datos aislados por usuario y proyecciones financieras.

## Stack

| Capa | Tecnologia |
|------|-----------|
| **Runtime** | [Bun](https://bun.sh) |
| **Frontend** | React 19 + TypeScript + Vite 7 |
| **UI** | shadcn/ui (radix-nova) + Tailwind CSS v4 |
| **State** | TanStack Query v5 (server state) + React Context (UI state) |
| **Charts** | Recharts |
| **Backend** | [Hono](https://hono.dev) (REST API) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team) + mysql2 |
| **Base de datos** | MariaDB |
| **Auth** | JWT (jose) + bcryptjs |
| **Validacion** | Zod |

## Estructura del monorepo

```
finza/
├── packages/
│   ├── frontend/                 # Vite + React SPA
│   │   ├── src/
│   │   │   ├── components/       # Componentes reutilizables
│   │   │   │   ├── ui/           # shadcn/ui primitivos
│   │   │   │   ├── app-sidebar.tsx
│   │   │   │   ├── app-header.tsx
│   │   │   │   ├── monthly-chart.tsx
│   │   │   │   ├── balance-line-chart.tsx
│   │   │   │   ├── user-management.tsx
│   │   │   │   └── sub-user-management.tsx
│   │   │   ├── pages/            # Vistas por ruta
│   │   │   │   ├── dashboard.tsx
│   │   │   │   ├── transacciones.tsx
│   │   │   │   ├── catalogo.tsx
│   │   │   │   ├── gastos-fijos.tsx
│   │   │   │   ├── ingresos-fijos.tsx
│   │   │   │   ├── configuracion.tsx
│   │   │   │   └── login.tsx
│   │   │   ├── lib/              # Utilidades y contextos
│   │   │   │   ├── api.ts        # Cliente HTTP tipado
│   │   │   │   ├── auth-context.tsx
│   │   │   │   ├── periodo-context.tsx
│   │   │   │   ├── types.ts
│   │   │   │   └── format.ts
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   └── vite.config.ts
│   │
│   └── backend/                  # Hono API server
│       ├── src/
│       │   ├── routes/           # Endpoints REST
│       │   │   ├── auth.ts       # Login, /me, change-password
│       │   │   ├── admin-users.ts
│       │   │   ├── sub-users.ts
│       │   │   ├── transacciones.ts
│       │   │   ├── catalogo.ts
│       │   │   ├── dashboard.ts
│       │   │   ├── gastos-fijos.ts
│       │   │   ├── ingresos-fijos.ts
│       │   │   └── config.ts
│       │   ├── middleware/
│       │   │   └── auth.ts       # JWT + permisos
│       │   ├── db/
│       │   │   ├── schema.ts     # Drizzle schema (9 tablas)
│       │   │   ├── connection.ts
│       │   │   ├── migrate.ts    # Crea DB + todas las tablas
│       │   │   └── create-admin.ts
│       │   ├── lib/
│       │   │   ├── auth.ts       # JWT + bcrypt helpers
│       │   │   ├── calculos.ts   # Motor de agregaciones SQL
│       │   │   └── types.ts
│       │   ├── env.ts            # Carga .env desde raiz del monorepo
│       │   └── index.ts
│       └── drizzle.config.ts
│
├── .env                          # Variables de entorno (no versionado)
├── .env.example                  # Plantilla de variables
├── package.json                  # Workspace root
└── README.md
```

## Requisitos

- [Bun](https://bun.sh) >= 1.0
- [Docker](https://docker.com) (para MariaDB) o MariaDB 11+ / MySQL 8+ instalado localmente

## Setup

### 1. Clonar e instalar

```bash
git clone <repo-url> && cd finza
bun install
```

### 2. Variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus valores:

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=tu_password
DATABASE_NAME=finza
BACKEND_PORT=3001
JWT_SECRET=cambia-esto-en-produccion
```

### 3. Levantar MariaDB con Docker

```bash
docker compose up -d
```

Esto levanta MariaDB 11 en `localhost:3306` usando la `DATABASE_PASSWORD` del `.env`.

> Si ya tienes MariaDB/MySQL corriendo localmente, puedes saltarte este paso.

### 4. Migrar base de datos

```bash
bun run db:migrate
```

### 5. Crear usuario administrador

```bash
bun run db:create-admin admin@finza.app tu_password "Tu Nombre"
```

## Desarrollo

```bash
# Ambos servicios en paralelo
bun run dev

# Solo frontend (localhost:5173)
bun run dev:frontend

# Solo backend (localhost:3001)
bun run dev:backend
```

El frontend proxifica `/api/*` al backend automaticamente.

## Scripts

### Root

| Script | Descripcion |
|--------|-------------|
| `bun run dev` | Frontend + backend en paralelo |
| `bun run dev:frontend` | Solo Vite |
| `bun run dev:backend` | Solo Hono |
| `bun run db:migrate` | Crea DB + todas las tablas |
| `bun run db:create-admin` | Crear admin por CLI |

### Frontend

| Script | Descripcion |
|--------|-------------|
| `bun run build` | Build produccion |
| `bun run typecheck` | Verificar tipos |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |

## Modelo de datos

9 tablas, todas aisladas por `user_id`:

| Tabla | Descripcion |
|-------|-------------|
| `usuarios` | Auth, roles (ADMIN/USER/SUB_USER), limite de sub-usuarios |
| `permisos_subusuario` | 12 permisos booleanos granulares |
| `categorias` | Clasificacion de transacciones |
| `subcategorias` | Subclasificacion |
| `entidades` | Origen/destino del dinero |
| `transacciones` | Registro de ingresos y gastos |
| `gastos_fijos` | Costos recurrentes |
| `ingresos_fijos` | Ingresos recurrentes |
| `configuracion` | Anio fiscal, IVA, moneda |

## API

Prefijo `/api`. Requiere `Authorization: Bearer <token>` excepto login.

| Grupo | Endpoints |
|-------|-----------|
| **Auth** | `POST /auth/login` `GET /auth/me` `PUT /auth/me` `PUT /auth/change-password` |
| **Admin** | `GET/POST/PUT/DELETE /admin/users/:id` |
| **Sub-users** | `GET/POST/PUT/DELETE /sub-users/:id` `GET /sub-users/limit` |
| **Transacciones** | `GET/POST/PUT/DELETE /transacciones/:id` `POST /transacciones/bulk` |
| **Catalogo** | `GET/POST/PUT/DELETE /categorias\|subcategorias\|entidades/:id` |
| **Dashboard** | `GET /dashboard/totales` `GET /dashboard/resumen-mensual` `GET /dashboard/desglose/:dim` |
| **Fijos** | `GET/POST/PUT/DELETE /gastos-fijos\|ingresos-fijos/:id` |
| **Config** | `GET/PUT /config` `POST /config/exportar` `POST /config/importar` |

## Roles

| Rol | Alcance |
|-----|---------|
| **ADMIN** | Todo. Gestiona usuarios del sistema. |
| **USER** | CRUD de sus datos. Crea sub-usuarios (limite configurable, default 3). |
| **SUB_USER** | Permisos granulares sobre datos de su usuario padre. |

## Monedas

| Simbolo | Moneda | Decimales |
|---------|--------|-----------|
| `€` | Euro | Si |
| `$` | Dolar | Si |
| `CLP$` | Peso chileno | No |

## Deploy (Dokploy / Docker)

El proyecto incluye un `Dockerfile` multi-stage que builda el frontend y lo sirve desde el backend de Hono en un solo contenedor.

### Con docker-compose (produccion completa)

```bash
# Crear .env con las variables de produccion, luego:
docker compose -f docker-compose.prod.yml up -d --build
```

Esto levanta:
- **finza-app** — Backend + frontend estático en el puerto 3001
- **finza-mariadb** — MariaDB 11 (solo accesible internamente)

### Con Dokploy

1. Crear una aplicación tipo **Docker** en Dokploy
2. Conectar el repositorio de GitHub
3. Dokploy detectará el `Dockerfile` automáticamente
4. Configurar las variables de entorno en Dokploy:
   - `DATABASE_HOST` — host de tu MariaDB (si usas el compose de prod, es `mariadb`)
   - `DATABASE_PORT` — `3306`
   - `DATABASE_USER` — `root`
   - `DATABASE_PASSWORD` — tu password
   - `DATABASE_NAME` — `finza`
   - `BACKEND_PORT` — `3001`
   - `JWT_SECRET` — un string largo y aleatorio
   - `CORS_ORIGINS` — tu dominio (ej: `https://finza.tudominio.com`)
5. Exponer el puerto `3001`
6. Después del primer deploy, ejecutar la migración:
   ```bash
   docker exec finza-app bun run src/db/migrate.ts
   docker exec finza-app bun run src/db/create-admin.ts admin@tudominio.com tuPassword "Admin"
   ```

### Solo el Dockerfile (sin compose)

```bash
docker build -t finza .
docker run -p 3001:3001 --env-file .env -e NODE_ENV=production finza
```

## Versionado

La version se define en el `package.json` raiz y se inyecta automaticamente en el frontend via Vite (`__APP_VERSION__`).

## Autor

[@bvironn](https://github.com/bvironn)

import "./env"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { serveStatic } from "hono/bun"
import { authMiddleware } from "./middleware/auth"
import { authRoutes } from "./routes/auth"
import { adminUsersRoutes } from "./routes/admin-users"
import { subUsersRoutes } from "./routes/sub-users"
import { categoriasRoutes, subcategoriasRoutes, entidadesRoutes } from "./routes/catalogo"
import { transaccionesRoutes } from "./routes/transacciones"
import { dashboardRoutes } from "./routes/dashboard"
import { gastosFijosRoutes } from "./routes/gastos-fijos"
import { ingresosFijosRoutes } from "./routes/ingresos-fijos"
import { configRoutes } from "./routes/config"

const app = new Hono()

// CORS
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:5174"]

app.use("/*", cors({
  origin: corsOrigins,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}))

// Public routes (no auth required)
app.route("/api/auth", authRoutes)

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }))

// All routes below require authentication
app.use("/api/*", authMiddleware)

// Admin routes
app.route("/api/admin/users", adminUsersRoutes)

// Sub-user management (USER + ADMIN)
app.route("/api/sub-users", subUsersRoutes)

// Data routes (user-scoped)
app.route("/api/categorias", categoriasRoutes)
app.route("/api/subcategorias", subcategoriasRoutes)
app.route("/api/entidades", entidadesRoutes)
app.route("/api/transacciones", transaccionesRoutes)
app.route("/api/dashboard", dashboardRoutes)
app.route("/api/gastos-fijos", gastosFijosRoutes)
app.route("/api/ingresos-fijos", ingresosFijosRoutes)
app.route("/api/config", configRoutes)

// In production, serve the frontend static files
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./frontend-dist" }))
  app.get("/*", serveStatic({ path: "./frontend-dist/index.html" }))
}

const port = Number(process.env.BACKEND_PORT ?? 3001)

console.log(`Backend running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}

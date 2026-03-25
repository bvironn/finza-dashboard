import { Hono } from "hono"
import { z } from "zod"
import { db } from "../db/connection"
import { usuarios, permisos_subusuario, configuracion } from "../db/schema"
import { eq } from "drizzle-orm"
import { hashPassword } from "../lib/auth"
import { authMiddleware, requireAdmin } from "../middleware/auth"

const app = new Hono()

// All routes require auth + admin role
app.use("/*", authMiddleware, requireAdmin)

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nombre: z.string().min(1).max(100),
  rol: z.enum(["ADMIN", "USER", "SUB_USER"]),
  parent_id: z.number().int().positive().optional(),
  permisos: z
    .object({
      ver_dashboard: z.boolean().default(true),
      ver_transacciones: z.boolean().default(true),
      crear_transacciones: z.boolean().default(false),
      editar_transacciones: z.boolean().default(false),
      eliminar_transacciones: z.boolean().default(false),
      ver_catalogo: z.boolean().default(true),
      editar_catalogo: z.boolean().default(false),
      ver_gastos_fijos: z.boolean().default(true),
      editar_gastos_fijos: z.boolean().default(false),
      ver_ingresos_fijos: z.boolean().default(true),
      editar_ingresos_fijos: z.boolean().default(false),
      ver_configuracion: z.boolean().default(false),
    })
    .optional(),
})

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  nombre: z.string().min(1).max(100).optional(),
  password: z.string().min(6).optional(),
  rol: z.enum(["ADMIN", "USER", "SUB_USER"]).optional(),
  activo: z.boolean().optional(),
  max_sub_users: z.number().int().min(0).optional(),
  parent_id: z.number().int().positive().nullable().optional(),
  permisos: z
    .object({
      ver_dashboard: z.boolean(),
      ver_transacciones: z.boolean(),
      crear_transacciones: z.boolean(),
      editar_transacciones: z.boolean(),
      eliminar_transacciones: z.boolean(),
      ver_catalogo: z.boolean(),
      editar_catalogo: z.boolean(),
      ver_gastos_fijos: z.boolean(),
      editar_gastos_fijos: z.boolean(),
      ver_ingresos_fijos: z.boolean(),
      editar_ingresos_fijos: z.boolean(),
      ver_configuracion: z.boolean(),
    })
    .partial()
    .optional(),
})

// GET / — list all users
app.get("/", async (c) => {
  const rows = await db
    .select({
      id: usuarios.id,
      email: usuarios.email,
      nombre: usuarios.nombre,
      rol: usuarios.rol,
      activo: usuarios.activo,
      parent_id: usuarios.parent_id,
      max_sub_users: usuarios.max_sub_users,
      created_at: usuarios.created_at,
    })
    .from(usuarios)
    .orderBy(usuarios.id)

  return c.json(rows)
})

// GET /:id — single user with permissions
app.get("/:id", async (c) => {
  const id = Number(c.req.param("id"))
  const [user] = await db
    .select({
      id: usuarios.id,
      email: usuarios.email,
      nombre: usuarios.nombre,
      rol: usuarios.rol,
      activo: usuarios.activo,
      parent_id: usuarios.parent_id,
    })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1)

  if (!user) return c.json({ error: "Usuario no encontrado" }, 404)

  let permisos = null
  if (user.rol === "SUB_USER") {
    const [perms] = await db
      .select()
      .from(permisos_subusuario)
      .where(eq(permisos_subusuario.usuario_id, id))
      .limit(1)
    if (perms) {
      const { id: _id, usuario_id: _uid, ...rest } = perms
      permisos = rest
    }
  }

  return c.json({ ...user, permisos })
})

// POST / — create user
app.post("/", async (c) => {
  const body = await c.req.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }

  const d = parsed.data
  const password_hash = await hashPassword(d.password)

  // SUB_USER must have a parent
  if (d.rol === "SUB_USER" && !d.parent_id) {
    return c.json({ error: "SUB_USER requiere parent_id" }, 400)
  }

  try {
    const [result] = await db.insert(usuarios).values({
      email: d.email,
      password_hash,
      nombre: d.nombre,
      rol: d.rol,
      parent_id: d.parent_id ?? null,
    })

    const newUserId = result.insertId

    // Create default config for non-SUB_USER
    if (d.rol !== "SUB_USER") {
      await db.insert(configuracion).values({
        user_id: newUserId,
        anio: new Date().getFullYear(),
        iva: "21.00",
        moneda: "€",
      })
    }

    // Create permissions for SUB_USER
    if (d.rol === "SUB_USER") {
      await db.insert(permisos_subusuario).values({
        usuario_id: newUserId,
        ...(d.permisos ?? {}),
      })
    }

    return c.json({ id: newUserId }, 201)
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return c.json({ error: "Ya existe un usuario con ese email" }, 409)
    }
    throw err
  }
})

// PUT /:id — update user
app.put("/:id", async (c) => {
  const id = Number(c.req.param("id"))
  const body = await c.req.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }

  const d = parsed.data
  const updates: Record<string, any> = {}
  if (d.email) updates.email = d.email
  if (d.nombre) updates.nombre = d.nombre
  if (d.rol) updates.rol = d.rol
  if (d.activo !== undefined) updates.activo = d.activo
  if (d.parent_id !== undefined) updates.parent_id = d.parent_id
  if (d.max_sub_users !== undefined) updates.max_sub_users = d.max_sub_users
  if (d.password) updates.password_hash = await hashPassword(d.password)

  if (Object.keys(updates).length > 0) {
    try {
      await db.update(usuarios).set(updates).where(eq(usuarios.id, id))
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        return c.json({ error: "Ya existe un usuario con ese email" }, 409)
      }
      throw err
    }
  }

  // Update permissions if provided
  if (d.permisos) {
    const [existing] = await db
      .select()
      .from(permisos_subusuario)
      .where(eq(permisos_subusuario.usuario_id, id))
      .limit(1)

    if (existing) {
      await db
        .update(permisos_subusuario)
        .set(d.permisos)
        .where(eq(permisos_subusuario.usuario_id, id))
    } else {
      await db.insert(permisos_subusuario).values({
        usuario_id: id,
        ...d.permisos,
      })
    }
  }

  return c.json({ ok: true })
})

// DELETE /:id — delete user
app.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"))
  const currentUser = c.get("user")

  if (id === currentUser.userId) {
    return c.json({ error: "No puedes eliminarte a ti mismo" }, 400)
  }

  await db.delete(usuarios).where(eq(usuarios.id, id))
  return c.json({ ok: true })
})

export const adminUsersRoutes = app

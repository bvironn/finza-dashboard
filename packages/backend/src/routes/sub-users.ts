import { Hono } from "hono"
import { z } from "zod"
import { db } from "../db/connection"
import { usuarios, permisos_subusuario } from "../db/schema"
import { eq, and, count } from "drizzle-orm"
import { hashPassword } from "../lib/auth"
import { authMiddleware } from "../middleware/auth"

const app = new Hono()

app.use("/*", authMiddleware)

const createSubUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nombre: z.string().min(1).max(100),
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

const updateSubUserSchema = z.object({
  email: z.string().email().optional(),
  nombre: z.string().min(1).max(100).optional(),
  password: z.string().min(6).optional(),
  activo: z.boolean().optional(),
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

// Only ADMIN and USER can manage sub-users
function assertCanManageSubUsers(c: any) {
  const user = c.get("user")
  if (user.rol === "SUB_USER") {
    return { error: true, response: c.json({ error: "Los sub-usuarios no pueden crear otros sub-usuarios" }, 403) }
  }
  return { error: false, userId: user.userId }
}

// GET / — list my sub-users
app.get("/", async (c) => {
  const check = assertCanManageSubUsers(c)
  if (check.error) return check.response
  const userId = check.userId!

  const rows = await db
    .select({
      id: usuarios.id,
      email: usuarios.email,
      nombre: usuarios.nombre,
      activo: usuarios.activo,
      created_at: usuarios.created_at,
    })
    .from(usuarios)
    .where(and(eq(usuarios.parent_id, userId), eq(usuarios.rol, "SUB_USER")))
    .orderBy(usuarios.id)

  return c.json(rows)
})

// GET /limit — get my sub-user limit info
app.get("/limit", async (c) => {
  const check = assertCanManageSubUsers(c)
  if (check.error) return check.response
  const userId = check.userId!

  const [user] = await db
    .select({ max_sub_users: usuarios.max_sub_users })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1)

  const [countResult] = await db
    .select({ count: count() })
    .from(usuarios)
    .where(and(eq(usuarios.parent_id, userId), eq(usuarios.rol, "SUB_USER")))

  return c.json({
    max: user?.max_sub_users ?? 3,
    current: countResult?.count ?? 0,
  })
})

// POST / — create sub-user
app.post("/", async (c) => {
  const check = assertCanManageSubUsers(c)
  if (check.error) return check.response
  const userId = check.userId!

  const body = await c.req.json()
  const parsed = createSubUserSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }

  // Check limit
  const [user] = await db
    .select({ max_sub_users: usuarios.max_sub_users })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1)

  const [countResult] = await db
    .select({ count: count() })
    .from(usuarios)
    .where(and(eq(usuarios.parent_id, userId), eq(usuarios.rol, "SUB_USER")))

  const currentCount = countResult?.count ?? 0
  const maxAllowed = user?.max_sub_users ?? 3

  if (currentCount >= maxAllowed) {
    return c.json({
      error: `Límite alcanzado: tienes ${currentCount}/${maxAllowed} sub-usuarios`,
    }, 403)
  }

  const d = parsed.data
  const password_hash = await hashPassword(d.password)

  try {
    const [result] = await db.insert(usuarios).values({
      email: d.email,
      password_hash,
      nombre: d.nombre,
      rol: "SUB_USER",
      parent_id: userId,
    })

    const newUserId = result.insertId

    await db.insert(permisos_subusuario).values({
      usuario_id: newUserId,
      ...(d.permisos ?? {}),
    })

    return c.json({ id: newUserId }, 201)
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return c.json({ error: "Ya existe un usuario con ese email" }, 409)
    }
    throw err
  }
})

// PUT /:id — update my sub-user
app.put("/:id", async (c) => {
  const check = assertCanManageSubUsers(c)
  if (check.error) return check.response
  const userId = check.userId!
  const id = Number(c.req.param("id"))

  // Verify ownership
  const [sub] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(and(eq(usuarios.id, id), eq(usuarios.parent_id, userId), eq(usuarios.rol, "SUB_USER")))
    .limit(1)

  if (!sub) return c.json({ error: "Sub-usuario no encontrado" }, 404)

  const body = await c.req.json()
  const parsed = updateSubUserSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }

  const d = parsed.data
  const updates: Record<string, any> = {}
  if (d.email) updates.email = d.email
  if (d.nombre) updates.nombre = d.nombre
  if (d.activo !== undefined) updates.activo = d.activo
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

// DELETE /:id — delete my sub-user
app.delete("/:id", async (c) => {
  const check = assertCanManageSubUsers(c)
  if (check.error) return check.response
  const userId = check.userId!
  const id = Number(c.req.param("id"))

  // Verify ownership
  const [sub] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(and(eq(usuarios.id, id), eq(usuarios.parent_id, userId), eq(usuarios.rol, "SUB_USER")))
    .limit(1)

  if (!sub) return c.json({ error: "Sub-usuario no encontrado" }, 404)

  await db.delete(usuarios).where(eq(usuarios.id, id))
  return c.json({ ok: true })
})

export const subUsersRoutes = app

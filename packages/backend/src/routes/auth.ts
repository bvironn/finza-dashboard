import { Hono } from "hono"
import { z } from "zod"
import { db } from "../db/connection"
import { usuarios, configuracion, permisos_subusuario } from "../db/schema"
import { eq } from "drizzle-orm"
import { hashPassword, verifyPassword, createToken } from "../lib/auth"
import { authMiddleware } from "../middleware/auth"

const app = new Hono()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(6),
})

// POST /login — authenticate
app.post("/login", async (c) => {
  const body = await c.req.json()
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: "Email y contraseña requeridos" }, 400)
  }

  const [user] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, parsed.data.email))
    .limit(1)

  if (!user) {
    return c.json({ error: "Credenciales incorrectas" }, 401)
  }

  if (!user.activo) {
    return c.json({ error: "Usuario desactivado" }, 401)
  }

  const valid = await verifyPassword(parsed.data.password, user.password_hash)
  if (!valid) {
    return c.json({ error: "Credenciales incorrectas" }, 401)
  }

  const token = await createToken({
    userId: user.id,
    email: user.email,
    rol: user.rol,
  })

  // Load permissions for SUB_USER
  let permisos = null
  if (user.rol === "SUB_USER") {
    const [perms] = await db
      .select()
      .from(permisos_subusuario)
      .where(eq(permisos_subusuario.usuario_id, user.id))
      .limit(1)
    if (perms) {
      const { id: _id, usuario_id: _uid, ...rest } = perms
      permisos = rest
    }
  }

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      permisos,
    },
  })
})

// GET /me — current user info (requires auth)
app.get("/me", authMiddleware, async (c) => {
  const { userId } = c.get("user")

  const [user] = await db
    .select({
      id: usuarios.id,
      email: usuarios.email,
      nombre: usuarios.nombre,
      rol: usuarios.rol,
    })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1)

  if (!user) return c.json({ error: "Usuario no encontrado" }, 404)

  let permisos = null
  if (user.rol === "SUB_USER") {
    const [perms] = await db
      .select()
      .from(permisos_subusuario)
      .where(eq(permisos_subusuario.usuario_id, userId))
      .limit(1)
    if (perms) {
      const { id: _id, usuario_id: _uid, ...rest } = perms
      permisos = rest
    }
  }

  return c.json({ ...user, permisos })
})

// PUT /me — update own account info (requires auth)
app.put("/me", authMiddleware, async (c) => {
  const { userId } = c.get("user")
  const body = await c.req.json()
  const parsed = z
    .object({
      nombre: z.string().min(1).max(100).optional(),
      email: z.string().email().optional(),
    })
    .safeParse(body)
  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }

  const updates: Record<string, any> = {}
  if (parsed.data.nombre) updates.nombre = parsed.data.nombre
  if (parsed.data.email) updates.email = parsed.data.email

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "No hay campos para actualizar" }, 400)
  }

  try {
    await db.update(usuarios).set(updates).where(eq(usuarios.id, userId))
    return c.json({ ok: true })
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return c.json({ error: "Ya existe un usuario con ese email" }, 409)
    }
    throw err
  }
})

// PUT /change-password (requires auth)
app.put("/change-password", authMiddleware, async (c) => {
  const { userId } = c.get("user")
  const body = await c.req.json()
  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, 400)
  }

  const [user] = await db
    .select({ password_hash: usuarios.password_hash })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1)

  if (!user) return c.json({ error: "Usuario no encontrado" }, 404)

  const valid = await verifyPassword(parsed.data.current_password, user.password_hash)
  if (!valid) {
    return c.json({ error: "Contraseña actual incorrecta" }, 401)
  }

  const newHash = await hashPassword(parsed.data.new_password)
  await db.update(usuarios).set({ password_hash: newHash }).where(eq(usuarios.id, userId))

  return c.json({ ok: true })
})

export const authRoutes = app

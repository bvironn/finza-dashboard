import type { APIRoute } from "astro"
import { db } from "@/lib/db/connection"
import { usuarios, permisos_subusuario } from "@/lib/db/schema"
import { eq, and, count } from "drizzle-orm"
import { hashPassword } from "@/lib/auth"
import { withAuth, json } from "@/lib/middleware"
import { createSubUserSchema } from "@/lib/validations/schemas"

export const GET: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  if (auth.user.rol === "SUB_USER") return json({ error: "Sin permisos" }, 403)

  const rows = await db
    .select({
      id: usuarios.id, email: usuarios.email, nombre: usuarios.nombre,
      activo: usuarios.activo, created_at: usuarios.created_at,
    })
    .from(usuarios)
    .where(and(eq(usuarios.parent_id, auth.user.userId), eq(usuarios.rol, "SUB_USER")))
    .orderBy(usuarios.id)

  return json(rows)
}

export const POST: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  if (auth.user.rol === "SUB_USER") return json({ error: "Sin permisos" }, 403)

  const body = await request.json()
  const parsed = createSubUserSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }

  const [user] = await db
    .select({ max_sub_users: usuarios.max_sub_users })
    .from(usuarios)
    .where(eq(usuarios.id, auth.user.userId))
    .limit(1)

  const [countResult] = await db
    .select({ count: count() })
    .from(usuarios)
    .where(and(eq(usuarios.parent_id, auth.user.userId), eq(usuarios.rol, "SUB_USER")))

  const currentCount = countResult?.count ?? 0
  const maxAllowed = user?.max_sub_users ?? 3

  if (currentCount >= maxAllowed) {
    return json({ error: `Límite alcanzado: tienes ${currentCount}/${maxAllowed} sub-usuarios` }, 403)
  }

  const d = parsed.data
  const password_hash = await hashPassword(d.password)

  try {
    const [result] = await db.insert(usuarios).values({
      email: d.email, password_hash, nombre: d.nombre,
      rol: "SUB_USER", parent_id: auth.user.userId,
    })

    const newUserId = result.insertId
    await db.insert(permisos_subusuario).values({
      usuario_id: newUserId, ...(d.permisos ?? {}),
    })

    return json({ id: newUserId }, 201)
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return json({ error: "Ya existe un usuario con ese email" }, 409)
    }
    throw err
  }
}

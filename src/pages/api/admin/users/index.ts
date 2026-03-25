import type { APIRoute } from "astro"
import { db } from "@/lib/db/connection"
import { usuarios, permisos_subusuario, configuracion } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { hashPassword } from "@/lib/auth"
import { withAuth, requireAdmin, json } from "@/lib/middleware"
import { createUserSchema } from "@/lib/validations/schemas"

export const GET: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  const denied = requireAdmin(auth.user)
  if (denied) return denied

  const rows = await db
    .select({
      id: usuarios.id, email: usuarios.email, nombre: usuarios.nombre,
      rol: usuarios.rol, activo: usuarios.activo, parent_id: usuarios.parent_id,
      max_sub_users: usuarios.max_sub_users, created_at: usuarios.created_at,
    })
    .from(usuarios)
    .orderBy(usuarios.id)

  return json(rows)
}

export const POST: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  const denied = requireAdmin(auth.user)
  if (denied) return denied

  const body = await request.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }

  const d = parsed.data
  if (d.rol === "SUB_USER" && !d.parent_id) {
    return json({ error: "SUB_USER requiere parent_id" }, 400)
  }

  const password_hash = await hashPassword(d.password)

  try {
    const [result] = await db.insert(usuarios).values({
      email: d.email, password_hash, nombre: d.nombre,
      rol: d.rol, parent_id: d.parent_id ?? null,
    })

    const newUserId = result.insertId

    if (d.rol !== "SUB_USER") {
      await db.insert(configuracion).values({
        user_id: newUserId, anio: new Date().getFullYear(),
        iva: "21.00", moneda: "€",
      })
    }

    if (d.rol === "SUB_USER") {
      await db.insert(permisos_subusuario).values({
        usuario_id: newUserId, ...(d.permisos ?? {}),
      })
    }

    return json({ id: newUserId }, 201)
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return json({ error: "Ya existe un usuario con ese email" }, 409)
    }
    throw err
  }
}

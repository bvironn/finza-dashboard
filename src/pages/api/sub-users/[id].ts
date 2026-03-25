import type { APIRoute } from "astro"
import { db } from "@/lib/db/connection"
import { usuarios, permisos_subusuario } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { hashPassword } from "@/lib/auth"
import { withAuth, json } from "@/lib/middleware"
import { updateSubUserSchema } from "@/lib/validations/schemas"

export const PUT: APIRoute = async ({ request, params }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  if (auth.user.rol === "SUB_USER") return json({ error: "Sin permisos" }, 403)
  const id = Number(params.id)

  const [sub] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(and(eq(usuarios.id, id), eq(usuarios.parent_id, auth.user.userId), eq(usuarios.rol, "SUB_USER")))
    .limit(1)

  if (!sub) return json({ error: "Sub-usuario no encontrado" }, 404)

  const body = await request.json()
  const parsed = updateSubUserSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
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
        return json({ error: "Ya existe un usuario con ese email" }, 409)
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
      await db.update(permisos_subusuario).set(d.permisos).where(eq(permisos_subusuario.usuario_id, id))
    } else {
      await db.insert(permisos_subusuario).values({ usuario_id: id, ...d.permisos })
    }
  }

  return json({ ok: true })
}

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  if (auth.user.rol === "SUB_USER") return json({ error: "Sin permisos" }, 403)
  const id = Number(params.id)

  const [sub] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(and(eq(usuarios.id, id), eq(usuarios.parent_id, auth.user.userId), eq(usuarios.rol, "SUB_USER")))
    .limit(1)

  if (!sub) return json({ error: "Sub-usuario no encontrado" }, 404)

  await db.delete(usuarios).where(eq(usuarios.id, id))
  return json({ ok: true })
}

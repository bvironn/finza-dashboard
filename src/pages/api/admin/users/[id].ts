import type { APIRoute } from "astro"
import { db } from "@/lib/db/connection"
import { usuarios, permisos_subusuario } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { hashPassword } from "@/lib/auth"
import { withAuth, requireAdmin, json } from "@/lib/middleware"
import { updateUserSchema } from "@/lib/validations/schemas"

export const GET: APIRoute = async ({ request, params }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  const denied = requireAdmin(auth.user)
  if (denied) return denied
  const id = Number(params.id)

  const [user] = await db
    .select({
      id: usuarios.id, email: usuarios.email, nombre: usuarios.nombre,
      rol: usuarios.rol, activo: usuarios.activo, parent_id: usuarios.parent_id,
      max_sub_users: usuarios.max_sub_users,
    })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1)

  if (!user) return json({ error: "Usuario no encontrado" }, 404)

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

  return json({ ...user, permisos })
}

export const PUT: APIRoute = async ({ request, params }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  const denied = requireAdmin(auth.user)
  if (denied) return denied
  const id = Number(params.id)

  const body = await request.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
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
  const denied = requireAdmin(auth.user)
  if (denied) return denied
  const id = Number(params.id)

  if (id === auth.user.userId) {
    return json({ error: "No puedes eliminarte a ti mismo" }, 400)
  }

  await db.delete(usuarios).where(eq(usuarios.id, id))
  return json({ ok: true })
}

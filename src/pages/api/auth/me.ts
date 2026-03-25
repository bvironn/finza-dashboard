import type { APIRoute } from "astro"
import { db } from "@/lib/db/connection"
import { usuarios, permisos_subusuario } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { withAuth, json } from "@/lib/middleware"
import { updateProfileSchema } from "@/lib/validations/schemas"

export const GET: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const [user] = await db
    .select({
      id: usuarios.id,
      email: usuarios.email,
      nombre: usuarios.nombre,
      rol: usuarios.rol,
    })
    .from(usuarios)
    .where(eq(usuarios.id, auth.user.userId))
    .limit(1)

  if (!user) return json({ error: "Usuario no encontrado" }, 404)

  let permisos = null
  if (user.rol === "SUB_USER") {
    const [perms] = await db
      .select()
      .from(permisos_subusuario)
      .where(eq(permisos_subusuario.usuario_id, auth.user.userId))
      .limit(1)
    if (perms) {
      const { id: _id, usuario_id: _uid, ...rest } = perms
      permisos = rest
    }
  }

  return json({ ...user, permisos })
}

export const PUT: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const body = await request.json()
  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }

  const updates: Record<string, any> = {}
  if (parsed.data.nombre) updates.nombre = parsed.data.nombre
  if (parsed.data.email) updates.email = parsed.data.email

  if (Object.keys(updates).length === 0) {
    return json({ error: "No hay campos para actualizar" }, 400)
  }

  try {
    await db.update(usuarios).set(updates).where(eq(usuarios.id, auth.user.userId))
    return json({ ok: true })
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return json({ error: "Ya existe un usuario con ese email" }, 409)
    }
    throw err
  }
}

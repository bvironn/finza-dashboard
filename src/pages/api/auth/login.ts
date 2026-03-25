import type { APIRoute } from "astro"
import { db } from "@/lib/db/connection"
import { usuarios, permisos_subusuario } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { verifyPassword, createToken } from "@/lib/auth"
import { json } from "@/lib/middleware"
import { loginSchema } from "@/lib/validations/schemas"

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json()
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: "Email y contraseña requeridos" }, 400)
  }

  const [user] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, parsed.data.email))
    .limit(1)

  if (!user) return json({ error: "Credenciales incorrectas" }, 401)
  if (!user.activo) return json({ error: "Usuario desactivado" }, 401)

  const valid = await verifyPassword(parsed.data.password, user.password_hash)
  if (!valid) return json({ error: "Credenciales incorrectas" }, 401)

  const token = await createToken({
    userId: user.id,
    email: user.email,
    rol: user.rol,
  })

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

  return json({
    token,
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      permisos,
    },
  })
}

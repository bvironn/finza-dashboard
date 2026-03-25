import type { APIRoute } from "astro"
import { db } from "@/lib/db/connection"
import { usuarios } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { hashPassword, verifyPassword } from "@/lib/auth"
import { withAuth, json } from "@/lib/middleware"
import { changePasswordSchema } from "@/lib/validations/schemas"

export const PUT: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const body = await request.json()
  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, 400)
  }

  const [user] = await db
    .select({ password_hash: usuarios.password_hash })
    .from(usuarios)
    .where(eq(usuarios.id, auth.user.userId))
    .limit(1)

  if (!user) return json({ error: "Usuario no encontrado" }, 404)

  const valid = await verifyPassword(parsed.data.current_password, user.password_hash)
  if (!valid) return json({ error: "Contraseña actual incorrecta" }, 401)

  const newHash = await hashPassword(parsed.data.new_password)
  await db.update(usuarios).set({ password_hash: newHash }).where(eq(usuarios.id, auth.user.userId))

  return json({ ok: true })
}

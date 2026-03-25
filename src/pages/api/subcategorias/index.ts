import type { APIRoute } from "astro"
import { db } from "@/lib/db/connection"
import { subcategorias } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { withAuth, json } from "@/lib/middleware"
import { nombreSchema } from "@/lib/validations/schemas"

export const GET: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const rows = await db
    .select()
    .from(subcategorias)
    .where(eq(subcategorias.user_id, auth.user.parentUserId))
    .orderBy(subcategorias.nombre)
  return json(rows)
}

export const POST: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const body = await request.json()
  const parsed = nombreSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: "Nombre inválido", details: parsed.error.flatten() }, 400)
  }

  try {
    const [result] = await db
      .insert(subcategorias)
      .values({ nombre: parsed.data.nombre, user_id: auth.user.parentUserId })
    return json({ id: result.insertId, nombre: parsed.data.nombre }, 201)
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return json({ error: "Ya existe un registro con ese nombre" }, 409)
    }
    throw err
  }
}

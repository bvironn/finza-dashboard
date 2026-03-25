import type { APIRoute } from "astro"
import { db } from "@/lib/db/connection"
import { entidades } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { withAuth, json } from "@/lib/middleware"
import { nombreSchema } from "@/lib/validations/schemas"

export const PUT: APIRoute = async ({ request, params }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  const id = Number(params.id)

  const body = await request.json()
  const parsed = nombreSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: "Nombre inválido", details: parsed.error.flatten() }, 400)
  }

  try {
    await db
      .update(entidades)
      .set({ nombre: parsed.data.nombre })
      .where(and(eq(entidades.id, id), eq(entidades.user_id, auth.user.parentUserId)))
    return json({ id, nombre: parsed.data.nombre })
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return json({ error: "Ya existe un registro con ese nombre" }, 409)
    }
    throw err
  }
}

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  const id = Number(params.id)

  const rows = await db.execute(
    sql`SELECT COUNT(*) as cnt FROM transacciones WHERE entidad_id = ${id} AND user_id = ${auth.user.parentUserId}`
  )
  const cnt = Number((rows[0] as unknown as any[])[0].cnt)
  if (cnt > 0) {
    return json({ error: `No se puede eliminar: hay ${cnt} transacciones asociadas` }, 409)
  }

  await db.delete(entidades).where(and(eq(entidades.id, id), eq(entidades.user_id, auth.user.parentUserId)))
  return json({ ok: true })
}

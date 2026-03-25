import type { APIRoute } from "astro"
import { z } from "zod/v4"
import { db } from "@/lib/db/connection"
import { transacciones } from "@/lib/db/schema"
import { withAuth, json } from "@/lib/middleware"
import { transaccionSchema } from "@/lib/validations/schemas"

export const POST: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const body = await request.json()
  const parsed = z.array(transaccionSchema).safeParse(body)
  if (!parsed.success) {
    return json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }

  const values = parsed.data.map((d) => ({
    user_id: auth.user.parentUserId,
    categoria_id: d.categoria_id,
    subcategoria_id: d.subcategoria_id,
    entidad_id: d.entidad_id,
    tipo: d.tipo,
    monto: String(d.monto),
    fecha: new Date(d.fecha),
    notas: d.notas ?? null,
  }))

  if (values.length > 0) {
    await db.insert(transacciones).values(values)
  }
  return json({ inserted: values.length }, 201)
}

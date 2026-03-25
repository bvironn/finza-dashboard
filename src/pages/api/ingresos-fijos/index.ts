import type { APIRoute } from "astro"
import { db, pool } from "@/lib/db/connection"
import { ingresos_fijos } from "@/lib/db/schema"
import { withAuth, json } from "@/lib/middleware"
import { ingresoFijoSchema } from "@/lib/validations/schemas"

export const GET: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const [rows] = await pool.execute(
    `SELECT inf.id, inf.concepto, inf.monto_anual, inf.monto_mensual,
           inf.entidad_id, e.nombre as entidad
    FROM ingresos_fijos inf
    LEFT JOIN entidades e ON inf.entidad_id = e.id
    WHERE inf.user_id = ?
    ORDER BY inf.concepto`,
    [auth.user.parentUserId]
  )
  const data = (rows as any[]).map((r) => ({
    ...r,
    monto_anual: r.monto_anual ? Number(r.monto_anual) : null,
    monto_mensual: r.monto_mensual ? Number(r.monto_mensual) : null,
  }))
  return json(data)
}

export const POST: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const body = await request.json()
  const parsed = ingresoFijoSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }

  const d = parsed.data
  const [result] = await db.insert(ingresos_fijos).values({
    concepto: d.concepto,
    monto_anual: d.monto_anual != null ? String(d.monto_anual) : null,
    monto_mensual: d.monto_mensual != null ? String(d.monto_mensual) : null,
    entidad_id: d.entidad_id ?? null,
    user_id: auth.user.parentUserId,
  })
  return json({ id: result.insertId }, 201)
}

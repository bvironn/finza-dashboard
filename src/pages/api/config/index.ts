import type { APIRoute } from "astro"
import { db, pool } from "@/lib/db/connection"
import { configuracion } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { withAuth, json } from "@/lib/middleware"
import { configSchema } from "@/lib/validations/schemas"

export const GET: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const [rows] = await pool.execute(`SELECT anio, iva, moneda FROM configuracion WHERE user_id = ?`, [auth.user.parentUserId])
  const data = rows as any[]
  if (data.length === 0) {
    return json({ anio: 2025, iva: 21.0, moneda: "€" })
  }
  return json({ anio: data[0].anio, iva: Number(data[0].iva), moneda: data[0].moneda })
}

export const PUT: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const body = await request.json()
  const parsed = configSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }

  const updates: Record<string, any> = {}
  if (parsed.data.anio !== undefined) updates.anio = parsed.data.anio
  if (parsed.data.iva !== undefined) updates.iva = String(parsed.data.iva)
  if (parsed.data.moneda !== undefined) updates.moneda = parsed.data.moneda

  await db.update(configuracion).set(updates).where(eq(configuracion.user_id, auth.user.parentUserId))
  return json({ ok: true })
}

import type { APIRoute } from "astro"
import { db } from "@/lib/db/connection"
import { ingresos_fijos } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { withAuth, json } from "@/lib/middleware"
import { ingresoFijoSchema } from "@/lib/validations/schemas"

export const PUT: APIRoute = async ({ request, params }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  const id = Number(params.id)

  const body = await request.json()
  const parsed = ingresoFijoSchema.partial().safeParse(body)
  if (!parsed.success) {
    return json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }

  const d = parsed.data
  const updates: Record<string, any> = {}
  if (d.concepto !== undefined) updates.concepto = d.concepto
  if (d.monto_anual !== undefined) updates.monto_anual = d.monto_anual != null ? String(d.monto_anual) : null
  if (d.monto_mensual !== undefined) updates.monto_mensual = d.monto_mensual != null ? String(d.monto_mensual) : null
  if (d.entidad_id !== undefined) updates.entidad_id = d.entidad_id

  await db
    .update(ingresos_fijos)
    .set(updates)
    .where(and(eq(ingresos_fijos.id, id), eq(ingresos_fijos.user_id, auth.user.parentUserId)))
  return json({ id, ...updates })
}

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  const id = Number(params.id)

  await db.delete(ingresos_fijos).where(and(eq(ingresos_fijos.id, id), eq(ingresos_fijos.user_id, auth.user.parentUserId)))
  return json({ ok: true })
}

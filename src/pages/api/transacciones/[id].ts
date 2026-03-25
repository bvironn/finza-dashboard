import type { APIRoute } from "astro"
import { db, pool } from "@/lib/db/connection"
import { transacciones } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { withAuth, json } from "@/lib/middleware"
import { transaccionSchema } from "@/lib/validations/schemas"

export const GET: APIRoute = async ({ request, params }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  const id = Number(params.id)

  const [rows] = await pool.execute(
    `SELECT t.id, t.categoria_id, c.nombre as categoria, t.subcategoria_id, s.nombre as subcategoria,
            t.entidad_id, e.nombre as entidad, t.tipo, t.monto, t.fecha, t.notas
     FROM transacciones t
     JOIN categorias c ON t.categoria_id = c.id
     JOIN subcategorias s ON t.subcategoria_id = s.id
     JOIN entidades e ON t.entidad_id = e.id
     WHERE t.id = ? AND t.user_id = ?`,
    [id, auth.user.parentUserId]
  )
  const data = rows as any[]
  if (data.length === 0) return json({ error: "No encontrada" }, 404)

  const row = data[0]
  return json({
    ...row,
    monto: Number(row.monto),
    fecha: row.fecha instanceof Date ? row.fecha.toISOString().split("T")[0] : String(row.fecha),
  })
}

export const PUT: APIRoute = async ({ request, params }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  const id = Number(params.id)

  const body = await request.json()
  const parsed = transaccionSchema.partial().safeParse(body)
  if (!parsed.success) {
    return json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }

  const d = parsed.data
  const updates: Record<string, any> = {}
  if (d.categoria_id !== undefined) updates.categoria_id = d.categoria_id
  if (d.subcategoria_id !== undefined) updates.subcategoria_id = d.subcategoria_id
  if (d.entidad_id !== undefined) updates.entidad_id = d.entidad_id
  if (d.tipo !== undefined) updates.tipo = d.tipo
  if (d.monto !== undefined) updates.monto = String(d.monto)
  if (d.fecha !== undefined) updates.fecha = new Date(d.fecha)
  if (d.notas !== undefined) updates.notas = d.notas

  if (Object.keys(updates).length === 0) {
    return json({ error: "No hay campos para actualizar" }, 400)
  }

  await db
    .update(transacciones)
    .set(updates)
    .where(and(eq(transacciones.id, id), eq(transacciones.user_id, auth.user.parentUserId)))
  return json({ id, ...updates })
}

export const DELETE: APIRoute = async ({ request, params }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  const id = Number(params.id)

  await db
    .delete(transacciones)
    .where(and(eq(transacciones.id, id), eq(transacciones.user_id, auth.user.parentUserId)))
  return json({ ok: true })
}

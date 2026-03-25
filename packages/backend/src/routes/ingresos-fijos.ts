import { Hono } from "hono"
import { db, pool } from "../db/connection"
import { ingresos_fijos } from "../db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

const app = new Hono()

const ingresoFijoSchema = z.object({
  concepto: z.string().min(1).max(255),
  monto_anual: z.number().positive().nullable().optional(),
  monto_mensual: z.number().positive().nullable().optional(),
  entidad_id: z.number().int().positive().nullable().optional(),
})

// GET / — list all with entity JOIN
app.get("/", async (c) => {
  const userId = c.get("user").parentUserId
  const [rows] = await pool.execute(
    `
    SELECT inf.id, inf.concepto, inf.monto_anual, inf.monto_mensual,
           inf.entidad_id, e.nombre as entidad
    FROM ingresos_fijos inf
    LEFT JOIN entidades e ON inf.entidad_id = e.id
    WHERE inf.user_id = ?
    ORDER BY inf.concepto
  `,
    [userId],
  )
  const data = (rows as any[]).map((r) => ({
    ...r,
    monto_anual: r.monto_anual ? Number(r.monto_anual) : null,
    monto_mensual: r.monto_mensual ? Number(r.monto_mensual) : null,
  }))
  return c.json(data)
})

// POST / — create
app.post("/", async (c) => {
  const userId = c.get("user").parentUserId
  const body = await c.req.json()
  const parsed = ingresoFijoSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }
  const d = parsed.data
  const [result] = await db.insert(ingresos_fijos).values({
    concepto: d.concepto,
    monto_anual: d.monto_anual != null ? String(d.monto_anual) : null,
    monto_mensual: d.monto_mensual != null ? String(d.monto_mensual) : null,
    entidad_id: d.entidad_id ?? null,
    user_id: userId,
  })
  return c.json({ id: result.insertId }, 201)
})

// PUT /:id — update
app.put("/:id", async (c) => {
  const userId = c.get("user").parentUserId
  const id = Number(c.req.param("id"))
  const body = await c.req.json()
  const parsed = ingresoFijoSchema.partial().safeParse(body)
  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
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
    .where(and(eq(ingresos_fijos.id, id), eq(ingresos_fijos.user_id, userId)))
  return c.json({ id, ...updates })
})

// DELETE /:id
app.delete("/:id", async (c) => {
  const userId = c.get("user").parentUserId
  const id = Number(c.req.param("id"))
  await db.delete(ingresos_fijos).where(and(eq(ingresos_fijos.id, id), eq(ingresos_fijos.user_id, userId)))
  return c.json({ ok: true })
})

export const ingresosFijosRoutes = app

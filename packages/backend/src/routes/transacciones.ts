import { Hono } from "hono"
import { db } from "../db/connection"
import { transacciones } from "../db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

const app = new Hono()

const transaccionSchema = z.object({
  categoria_id: z.number().int().positive(),
  subcategoria_id: z.number().int().positive(),
  entidad_id: z.number().int().positive(),
  tipo: z.enum(["GASTO", "INGRESO"]),
  monto: z.number().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notas: z.string().optional(),
})

// GET / — list with filters + pagination
app.get("/", async (c) => {
  const userId = c.get("user").parentUserId
  const q = c.req.query()
  const page = Math.max(1, Number(q.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 50))
  const offset = (page - 1) * limit

  const conditions: string[] = ["t.user_id = ?"]
  const params: any[] = [userId]

  if (q.anio) {
    conditions.push("YEAR(t.fecha) = ?")
    params.push(Number(q.anio))
  }
  if (q.mes) {
    conditions.push("MONTH(t.fecha) = ?")
    params.push(Number(q.mes))
  }
  if (q.tipo) {
    conditions.push("t.tipo = ?")
    params.push(q.tipo)
  }
  if (q.categoria_id) {
    conditions.push("t.categoria_id = ?")
    params.push(Number(q.categoria_id))
  }
  if (q.subcategoria_id) {
    conditions.push("t.subcategoria_id = ?")
    params.push(Number(q.subcategoria_id))
  }
  if (q.entidad_id) {
    conditions.push("t.entidad_id = ?")
    params.push(Number(q.entidad_id))
  }
  if (q.buscar) {
    conditions.push("t.notas LIKE ?")
    params.push(`%${q.buscar}%`)
  }
  if (q.fecha_desde) {
    conditions.push("t.fecha >= ?")
    params.push(q.fecha_desde)
  }
  if (q.fecha_hasta) {
    conditions.push("t.fecha <= ?")
    params.push(q.fecha_hasta)
  }

  const where = `WHERE ${conditions.join(" AND ")}`

  const ordenColumnas: Record<string, string> = {
    fecha: "t.fecha",
    monto: "t.monto",
    tipo: "t.tipo",
    categoria: "c.nombre",
    subcategoria: "s.nombre",
    entidad: "e.nombre",
  }
  const ordenCol = ordenColumnas[q.orden ?? "fecha"] ?? "t.fecha"
  const ordenDir = q.dir === "asc" ? "ASC" : "DESC"

  const baseQuery = `
    FROM transacciones t
    JOIN categorias c ON t.categoria_id = c.id
    JOIN subcategorias s ON t.subcategoria_id = s.id
    JOIN entidades e ON t.entidad_id = e.id
    ${where}
  `

  const { pool } = await import("../db/connection")

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) as total ${baseQuery}`,
    params
  )
  const total = Number((countRows as any[])[0].total)

  const [dataRows] = await pool.execute(
    `SELECT t.id, t.categoria_id, c.nombre as categoria, t.subcategoria_id, s.nombre as subcategoria,
            t.entidad_id, e.nombre as entidad, t.tipo, t.monto, t.fecha, t.notas
     ${baseQuery}
     ORDER BY ${ordenCol} ${ordenDir}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  const data = (dataRows as any[]).map((row) => ({
    ...row,
    monto: Number(row.monto),
    fecha: row.fecha instanceof Date
      ? row.fecha.toISOString().split("T")[0]
      : String(row.fecha),
  }))

  return c.json({
    data,
    total,
    page,
    pages: Math.ceil(total / limit),
  })
})

// GET /:id — single transaction
app.get("/:id", async (c) => {
  const userId = c.get("user").parentUserId
  const id = Number(c.req.param("id"))
  const { pool } = await import("../db/connection")
  const [rows] = await pool.execute(
    `SELECT t.id, t.categoria_id, c.nombre as categoria, t.subcategoria_id, s.nombre as subcategoria,
            t.entidad_id, e.nombre as entidad, t.tipo, t.monto, t.fecha, t.notas
     FROM transacciones t
     JOIN categorias c ON t.categoria_id = c.id
     JOIN subcategorias s ON t.subcategoria_id = s.id
     JOIN entidades e ON t.entidad_id = e.id
     WHERE t.id = ? AND t.user_id = ?`,
    [id, userId]
  )
  const data = rows as any[]
  if (data.length === 0) return c.json({ error: "No encontrada" }, 404)

  const row = data[0]
  return c.json({
    ...row,
    monto: Number(row.monto),
    fecha: row.fecha instanceof Date
      ? row.fecha.toISOString().split("T")[0]
      : String(row.fecha),
  })
})

// POST / — create
app.post("/", async (c) => {
  const userId = c.get("user").parentUserId
  const body = await c.req.json()
  const parsed = transaccionSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }
  const d = parsed.data
  const [result] = await db.insert(transacciones).values({
    user_id: userId,
    categoria_id: d.categoria_id,
    subcategoria_id: d.subcategoria_id,
    entidad_id: d.entidad_id,
    tipo: d.tipo,
    monto: String(d.monto),
    fecha: new Date(d.fecha),
    notas: d.notas ?? null,
  })
  return c.json({ id: result.insertId }, 201)
})

// PUT /:id — update
app.put("/:id", async (c) => {
  const userId = c.get("user").parentUserId
  const id = Number(c.req.param("id"))
  const body = await c.req.json()
  const parsed = transaccionSchema.partial().safeParse(body)
  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
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
    return c.json({ error: "No hay campos para actualizar" }, 400)
  }

  await db
    .update(transacciones)
    .set(updates)
    .where(and(eq(transacciones.id, id), eq(transacciones.user_id, userId)))
  return c.json({ id, ...updates })
})

// DELETE /:id
app.delete("/:id", async (c) => {
  const userId = c.get("user").parentUserId
  const id = Number(c.req.param("id"))
  await db
    .delete(transacciones)
    .where(and(eq(transacciones.id, id), eq(transacciones.user_id, userId)))
  return c.json({ ok: true })
})

// POST /bulk — bulk insert
app.post("/bulk", async (c) => {
  const userId = c.get("user").parentUserId
  const body = await c.req.json()
  const parsed = z.array(transaccionSchema).safeParse(body)
  if (!parsed.success) {
    return c.json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }
  const values = parsed.data.map((d) => ({
    user_id: userId,
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
  return c.json({ inserted: values.length }, 201)
})

export const transaccionesRoutes = app

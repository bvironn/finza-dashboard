import { Hono } from "hono"
import { db, pool } from "../db/connection"
import { configuracion, categorias, subcategorias, entidades, transacciones, gastos_fijos, ingresos_fijos } from "../db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const app = new Hono()

// GET / — get config
app.get("/", async (c) => {
  const userId = c.get("user").parentUserId
  const [rows] = await pool.execute(`SELECT anio, iva, moneda FROM configuracion WHERE user_id = ?`, [userId])
  const data = rows as any[]
  if (data.length === 0) {
    return c.json({ anio: 2025, iva: 21.0, moneda: "\u20AC" })
  }
  return c.json({
    anio: data[0].anio,
    iva: Number(data[0].iva),
    moneda: data[0].moneda,
  })
})

// PUT / — update config
app.put("/", async (c) => {
  const userId = c.get("user").parentUserId
  const body = await c.req.json()
  const schema = z.object({
    anio: z.number().int().optional(),
    iva: z.number().min(0).max(100).optional(),
    moneda: z.string().max(5).optional(),
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: "Datos inv\u00E1lidos", details: parsed.error.flatten() }, 400)
  }
  const updates: Record<string, any> = {}
  if (parsed.data.anio !== undefined) updates.anio = parsed.data.anio
  if (parsed.data.iva !== undefined) updates.iva = String(parsed.data.iva)
  if (parsed.data.moneda !== undefined) updates.moneda = parsed.data.moneda

  await db.update(configuracion).set(updates).where(eq(configuracion.user_id, userId))
  return c.json({ ok: true })
})

// POST /exportar — export all data as JSON
app.post("/exportar", async (c) => {
  const userId = c.get("user").parentUserId
  const [cats] = await pool.execute(`SELECT * FROM categorias WHERE user_id = ?`, [userId])
  const [subcats] = await pool.execute(`SELECT * FROM subcategorias WHERE user_id = ?`, [userId])
  const [ents] = await pool.execute(`SELECT * FROM entidades WHERE user_id = ?`, [userId])
  const [trans] = await pool.execute(`SELECT * FROM transacciones WHERE user_id = ?`, [userId])
  const [gf] = await pool.execute(`SELECT * FROM gastos_fijos WHERE user_id = ?`, [userId])
  const [inf] = await pool.execute(`SELECT * FROM ingresos_fijos WHERE user_id = ?`, [userId])
  const [conf] = await pool.execute(`SELECT * FROM configuracion WHERE user_id = ?`, [userId])

  const exportData = {
    version: 1,
    exported_at: new Date().toISOString(),
    categorias: cats,
    subcategorias: subcats,
    entidades: ents,
    transacciones: trans,
    gastos_fijos: gf,
    ingresos_fijos: inf,
    configuracion: conf,
  }

  return c.json(exportData)
})

// POST /importar — import JSON dump
app.post("/importar", async (c) => {
  const userId = c.get("user").parentUserId
  const body = await c.req.json()

  const conn = await pool.getConnection()
  try {
    // Delete only this user's data in a dedicated connection
    await conn.execute(`SET FOREIGN_KEY_CHECKS = 0`)
    await conn.execute(`DELETE FROM transacciones WHERE user_id = ?`, [userId])
    await conn.execute(`DELETE FROM gastos_fijos WHERE user_id = ?`, [userId])
    await conn.execute(`DELETE FROM ingresos_fijos WHERE user_id = ?`, [userId])
    await conn.execute(`DELETE FROM categorias WHERE user_id = ?`, [userId])
    await conn.execute(`DELETE FROM subcategorias WHERE user_id = ?`, [userId])
    await conn.execute(`DELETE FROM entidades WHERE user_id = ?`, [userId])
    await conn.execute(`DELETE FROM configuracion WHERE user_id = ?`, [userId])
    await conn.execute(`SET FOREIGN_KEY_CHECKS = 1`)

    if (body.categorias?.length) {
      for (const row of body.categorias) {
        await conn.execute(`INSERT INTO categorias (id, nombre, user_id) VALUES (?, ?, ?)`, [row.id, row.nombre, userId])
      }
    }
    if (body.subcategorias?.length) {
      for (const row of body.subcategorias) {
        await conn.execute(`INSERT INTO subcategorias (id, nombre, user_id) VALUES (?, ?, ?)`, [row.id, row.nombre, userId])
      }
    }
    if (body.entidades?.length) {
      for (const row of body.entidades) {
        await conn.execute(`INSERT INTO entidades (id, nombre, user_id) VALUES (?, ?, ?)`, [row.id, row.nombre, userId])
      }
    }
    if (body.transacciones?.length) {
      for (const row of body.transacciones) {
        await conn.execute(
          `INSERT INTO transacciones (id, categoria_id, subcategoria_id, entidad_id, tipo, monto, fecha, notas, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.id, row.categoria_id, row.subcategoria_id, row.entidad_id, row.tipo, row.monto, row.fecha, row.notas, userId]
        )
      }
    }
    if (body.gastos_fijos?.length) {
      for (const row of body.gastos_fijos) {
        await conn.execute(
          `INSERT INTO gastos_fijos (id, concepto, monto_anual, monto_mensual, entidad_id, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
          [row.id, row.concepto, row.monto_anual, row.monto_mensual, row.entidad_id, userId]
        )
      }
    }
    if (body.ingresos_fijos?.length) {
      for (const row of body.ingresos_fijos) {
        await conn.execute(
          `INSERT INTO ingresos_fijos (id, concepto, monto_anual, monto_mensual, entidad_id, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
          [row.id, row.concepto, row.monto_anual, row.monto_mensual, row.entidad_id, userId]
        )
      }
    }
    if (body.configuracion?.length) {
      const conf = body.configuracion[0]
      await conn.execute(
        `INSERT INTO configuracion (user_id, anio, iva, moneda) VALUES (?, ?, ?, ?)`,
        [userId, conf.anio, conf.iva, conf.moneda]
      )
    }

    return c.json({ ok: true })
  } catch (err: any) {
    return c.json({ error: "Error al importar", details: err.message }, 500)
  } finally {
    await conn.execute(`SET FOREIGN_KEY_CHECKS = 1`).catch(() => {})
    conn.release()
  }
})

export const configRoutes = app

import type { APIRoute } from "astro"
import { pool } from "@/lib/db/connection"
import { withAuth, json } from "@/lib/middleware"

export const POST: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const userId = auth.user.parentUserId
  const body = await request.json()

  const conn = await pool.getConnection()
  try {
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

    return json({ ok: true })
  } catch (err: any) {
    return json({ error: "Error al importar", details: err.message }, 500)
  } finally {
    await conn.execute(`SET FOREIGN_KEY_CHECKS = 1`).catch(() => {})
    conn.release()
  }
}

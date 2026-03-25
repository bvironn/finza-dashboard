import type { APIRoute } from "astro"
import { pool } from "@/lib/db/connection"
import { withAuth, json } from "@/lib/middleware"

export const POST: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const userId = auth.user.parentUserId
  const [cats] = await pool.execute(`SELECT * FROM categorias WHERE user_id = ?`, [userId])
  const [subcats] = await pool.execute(`SELECT * FROM subcategorias WHERE user_id = ?`, [userId])
  const [ents] = await pool.execute(`SELECT * FROM entidades WHERE user_id = ?`, [userId])
  const [trans] = await pool.execute(`SELECT * FROM transacciones WHERE user_id = ?`, [userId])
  const [gf] = await pool.execute(`SELECT * FROM gastos_fijos WHERE user_id = ?`, [userId])
  const [inf] = await pool.execute(`SELECT * FROM ingresos_fijos WHERE user_id = ?`, [userId])
  const [conf] = await pool.execute(`SELECT * FROM configuracion WHERE user_id = ?`, [userId])

  return json({
    version: 1,
    exported_at: new Date().toISOString(),
    categorias: cats,
    subcategorias: subcats,
    entidades: ents,
    transacciones: trans,
    gastos_fijos: gf,
    ingresos_fijos: inf,
    configuracion: conf,
  })
}

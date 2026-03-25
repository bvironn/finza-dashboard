import type { APIRoute } from "astro"
import { db } from "@/lib/db/connection"
import { pool } from "@/lib/db/connection"
import { transacciones } from "@/lib/db/schema"
import { withAuth, json } from "@/lib/middleware"
import { transaccionSchema } from "@/lib/validations/schemas"

export const GET: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const q = Object.fromEntries(url.searchParams)
  const page = Math.max(1, Number(q.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 50))
  const offset = (page - 1) * limit

  const conditions: string[] = ["t.user_id = ?"]
  const params: any[] = [auth.user.parentUserId]

  if (q.anio) { conditions.push("YEAR(t.fecha) = ?"); params.push(Number(q.anio)) }
  if (q.mes) { conditions.push("MONTH(t.fecha) = ?"); params.push(Number(q.mes)) }
  if (q.tipo) { conditions.push("t.tipo = ?"); params.push(q.tipo) }
  if (q.categoria_id) { conditions.push("t.categoria_id = ?"); params.push(Number(q.categoria_id)) }
  if (q.subcategoria_id) { conditions.push("t.subcategoria_id = ?"); params.push(Number(q.subcategoria_id)) }
  if (q.entidad_id) { conditions.push("t.entidad_id = ?"); params.push(Number(q.entidad_id)) }
  if (q.buscar) { conditions.push("t.notas LIKE ?"); params.push(`%${q.buscar}%`) }
  if (q.fecha_desde) { conditions.push("t.fecha >= ?"); params.push(q.fecha_desde) }
  if (q.fecha_hasta) { conditions.push("t.fecha <= ?"); params.push(q.fecha_hasta) }

  const where = `WHERE ${conditions.join(" AND ")}`

  const ordenColumnas: Record<string, string> = {
    fecha: "t.fecha", monto: "t.monto", tipo: "t.tipo",
    categoria: "c.nombre", subcategoria: "s.nombre", entidad: "e.nombre",
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

  const [countRows] = await pool.execute(`SELECT COUNT(*) as total ${baseQuery}`, params)
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
    fecha: row.fecha instanceof Date ? row.fecha.toISOString().split("T")[0] : String(row.fecha),
  }))

  return json({ data, total, page, pages: Math.ceil(total / limit) })
}

export const POST: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const body = await request.json()
  const parsed = transaccionSchema.safeParse(body)
  if (!parsed.success) {
    return json({ error: "Datos inválidos", details: parsed.error.flatten() }, 400)
  }

  const d = parsed.data
  const [result] = await db.insert(transacciones).values({
    user_id: auth.user.parentUserId,
    categoria_id: d.categoria_id,
    subcategoria_id: d.subcategoria_id,
    entidad_id: d.entidad_id,
    tipo: d.tipo,
    monto: String(d.monto),
    fecha: new Date(d.fecha),
    notas: d.notas ?? null,
  })
  return json({ id: result.insertId }, 201)
}

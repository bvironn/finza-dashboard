import { db, pool } from "./db/connection"
import { categorias, subcategorias, entidades } from "./db/schema"
import { sql } from "drizzle-orm"
import type { ResumenMes, DesgloseDimension } from "@/types"

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export async function getTotalesAnuales(anio: number, userId: number) {
  const rows = await db.execute(sql`
    SELECT tipo, SUM(monto) as total
    FROM transacciones
    WHERE YEAR(fecha) = ${anio} AND user_id = ${userId}
    GROUP BY tipo
  `)

  let ingresos = 0
  let gastos = 0

  for (const row of rows[0] as unknown as any[]) {
    if (row.tipo === "INGRESO") ingresos = Number(row.total)
    if (row.tipo === "GASTO") gastos = Number(row.total)
  }

  return { ingresos, gastos, balance: ingresos - gastos }
}

export async function getResumenMensual(anio: number, userId: number): Promise<ResumenMes[]> {
  const rows = await db.execute(sql`
    SELECT MONTH(fecha) as mes, tipo, SUM(monto) as total
    FROM transacciones
    WHERE YEAR(fecha) = ${anio} AND user_id = ${userId}
    GROUP BY MONTH(fecha), tipo
    ORDER BY mes
  `)

  const mapa = new Map<number, { ingresos: number; gastos: number }>()
  for (let i = 1; i <= 12; i++) {
    mapa.set(i, { ingresos: 0, gastos: 0 })
  }

  for (const row of rows[0] as unknown as any[]) {
    const entry = mapa.get(row.mes)!
    if (row.tipo === "INGRESO") entry.ingresos = Number(row.total)
    if (row.tipo === "GASTO") entry.gastos = Number(row.total)
  }

  return Array.from(mapa.entries()).map(([mes, data]) => ({
    mes,
    nombre: MESES[mes - 1],
    ingresos: data.ingresos,
    gastos: data.gastos,
    balance: data.ingresos - data.gastos,
  }))
}

export async function getResumenMensualConProyeccion(anio: number, userId: number): Promise<ResumenMes[]> {
  const base = await getResumenMensual(anio, userId)

  const [gfRows] = await pool.execute(
    `SELECT COALESCE(SUM(CASE WHEN monto_mensual IS NOT NULL THEN monto_mensual ELSE monto_anual / 12 END), 0) as total FROM gastos_fijos WHERE user_id = ?`,
    [userId]
  )
  const gastoFijoMensual = Number((gfRows as any[])[0].total)

  const [ifRows] = await pool.execute(
    `SELECT COALESCE(SUM(CASE WHEN monto_mensual IS NOT NULL THEN monto_mensual ELSE monto_anual / 12 END), 0) as total FROM ingresos_fijos WHERE user_id = ?`,
    [userId]
  )
  const ingresoFijoMensual = Number((ifRows as any[])[0].total)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  return base.map((mes) => {
    const isFuture = anio > currentYear || (anio === currentYear && mes.mes > currentMonth)
    if (isFuture) {
      return {
        ...mes,
        ingresos: mes.ingresos + ingresoFijoMensual,
        gastos: mes.gastos + gastoFijoMensual,
        balance: (mes.ingresos + ingresoFijoMensual) - (mes.gastos + gastoFijoMensual),
        proyectado: true,
      }
    }
    return { ...mes, proyectado: false }
  })
}

export async function getTotalesConProyeccion(anio: number, userId: number) {
  const resumen = await getResumenMensualConProyeccion(anio, userId)
  const ingresos = resumen.reduce((acc, m) => acc + m.ingresos, 0)
  const gastos = resumen.reduce((acc, m) => acc + m.gastos, 0)
  return { ingresos, gastos, balance: ingresos - gastos }
}

export async function getTotalesMes(anio: number, mes: number, userId: number) {
  const resumen = await getResumenMensualConProyeccion(anio, userId)
  const mesData = resumen.find((m) => m.mes === mes)
  if (mesData) {
    return { ingresos: mesData.ingresos, gastos: mesData.gastos, balance: mesData.balance }
  }

  const rows = await db.execute(sql`
    SELECT tipo, SUM(monto) as total
    FROM transacciones
    WHERE YEAR(fecha) = ${anio} AND MONTH(fecha) = ${mes} AND user_id = ${userId}
    GROUP BY tipo
  `)

  let ingresos = 0
  let gastos = 0

  for (const row of rows[0] as unknown as any[]) {
    if (row.tipo === "INGRESO") ingresos = Number(row.total)
    if (row.tipo === "GASTO") gastos = Number(row.total)
  }

  return { ingresos, gastos, balance: ingresos - gastos }
}

export async function getDesglose(
  dimension: "categorias" | "subcategorias" | "entidades",
  anio: number,
  userId: number,
  mes?: number | null
): Promise<DesgloseDimension[]> {
  const joinTable =
    dimension === "categorias" ? categorias
    : dimension === "subcategorias" ? subcategorias
    : entidades

  const fkColumn =
    dimension === "categorias" ? "categoria_id"
    : dimension === "subcategorias" ? "subcategoria_id"
    : "entidad_id"

  const mesFilter = mes ? sql` AND MONTH(t.fecha) = ${mes}` : sql``

  const rows = await db.execute(sql`
    SELECT
      d.id,
      d.nombre,
      t.tipo,
      SUM(t.monto) as total,
      COUNT(*) as num_transacciones
    FROM transacciones t
    JOIN ${joinTable} d ON t.${sql.raw(fkColumn)} = d.id
    WHERE YEAR(t.fecha) = ${anio} AND t.user_id = ${userId}${mesFilter}
    GROUP BY d.id, d.nombre, t.tipo
    ORDER BY total DESC
  `)

  const mapa = new Map<number, DesgloseDimension>()

  for (const row of rows[0] as unknown as any[]) {
    if (!mapa.has(row.id)) {
      mapa.set(row.id, {
        id: row.id,
        nombre: row.nombre,
        gastos: 0,
        ingresos: 0,
        balance: 0,
        transacciones: 0,
      })
    }
    const entry = mapa.get(row.id)!
    const total = Number(row.total)
    const count = Number(row.num_transacciones)

    if (row.tipo === "GASTO") entry.gastos += total
    if (row.tipo === "INGRESO") entry.ingresos += total
    entry.transacciones += count
  }

  return Array.from(mapa.values()).map((e) => ({
    ...e,
    balance: e.ingresos - e.gastos,
  })).sort((a, b) => b.gastos - a.gastos)
}

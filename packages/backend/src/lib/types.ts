export interface Categoria {
  id: number
  nombre: string
}

export interface Subcategoria {
  id: number
  nombre: string
}

export interface Entidad {
  id: number
  nombre: string
}

export interface Transaccion {
  id: number
  categoria_id: number
  categoria: string
  subcategoria_id: number
  subcategoria: string
  entidad_id: number
  entidad: string
  tipo: "GASTO" | "INGRESO"
  monto: number
  fecha: string
  notas: string | null
}

export interface TransaccionInput {
  categoria_id: number
  subcategoria_id: number
  entidad_id: number
  tipo: "GASTO" | "INGRESO"
  monto: number
  fecha: string
  notas?: string
}

export interface GastoFijo {
  id: number
  concepto: string
  monto_anual: number | null
  monto_mensual: number | null
  entidad_id: number | null
  entidad: string | null
}

export interface Configuracion {
  anio: number
  iva: number
  moneda: string
}

export interface ResumenMes {
  mes: number
  nombre: string
  ingresos: number
  gastos: number
  balance: number
}

export interface DesgloseDimension {
  id: number
  nombre: string
  gastos: number
  ingresos: number
  balance: number
  transacciones: number
}

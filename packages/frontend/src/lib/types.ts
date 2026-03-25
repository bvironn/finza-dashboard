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

export interface IngresoFijo {
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
  proyectado?: boolean
}

export interface DesgloseDimension {
  id: number
  nombre: string
  gastos: number
  ingresos: number
  balance: number
  transacciones: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pages: number
}

// ─── Auth ────────────────────────────────────────────────────────
export type Rol = "ADMIN" | "USER" | "SUB_USER"

export interface SubUserPermisos {
  ver_dashboard: boolean
  ver_transacciones: boolean
  crear_transacciones: boolean
  editar_transacciones: boolean
  eliminar_transacciones: boolean
  ver_catalogo: boolean
  editar_catalogo: boolean
  ver_gastos_fijos: boolean
  editar_gastos_fijos: boolean
  ver_ingresos_fijos: boolean
  editar_ingresos_fijos: boolean
  ver_configuracion: boolean
}

export interface AuthUser {
  id: number
  email: string
  nombre: string
  rol: Rol
  permisos: SubUserPermisos | null
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface Usuario {
  id: number
  email: string
  nombre: string
  rol: Rol
  activo: boolean
  parent_id: number | null
  max_sub_users: number
  created_at: string
  permisos?: SubUserPermisos | null
}

export interface SubUserLimitInfo {
  max: number
  current: number
}

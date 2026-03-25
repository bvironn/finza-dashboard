import { z } from "zod/v4"

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(6),
})

export const updateProfileSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
})

export const nombreSchema = z.object({
  nombre: z.string().min(1).max(100),
})

export const transaccionSchema = z.object({
  categoria_id: z.number().int().positive(),
  subcategoria_id: z.number().int().positive(),
  entidad_id: z.number().int().positive(),
  tipo: z.enum(["GASTO", "INGRESO"]),
  monto: z.number().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notas: z.string().optional(),
})

export const gastoFijoSchema = z.object({
  concepto: z.string().min(1).max(255),
  monto_anual: z.number().positive().nullable().optional(),
  monto_mensual: z.number().positive().nullable().optional(),
  entidad_id: z.number().int().positive().nullable().optional(),
})

export const ingresoFijoSchema = z.object({
  concepto: z.string().min(1).max(255),
  monto_anual: z.number().positive().nullable().optional(),
  monto_mensual: z.number().positive().nullable().optional(),
  entidad_id: z.number().int().positive().nullable().optional(),
})

export const configSchema = z.object({
  anio: z.number().int().optional(),
  iva: z.number().min(0).max(100).optional(),
  moneda: z.string().max(5).optional(),
})

export const createSubUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nombre: z.string().min(1).max(100),
  permisos: z.object({
    ver_dashboard: z.boolean().default(true),
    ver_transacciones: z.boolean().default(true),
    crear_transacciones: z.boolean().default(false),
    editar_transacciones: z.boolean().default(false),
    eliminar_transacciones: z.boolean().default(false),
    ver_catalogo: z.boolean().default(true),
    editar_catalogo: z.boolean().default(false),
    ver_gastos_fijos: z.boolean().default(true),
    editar_gastos_fijos: z.boolean().default(false),
    ver_ingresos_fijos: z.boolean().default(true),
    editar_ingresos_fijos: z.boolean().default(false),
    ver_configuracion: z.boolean().default(false),
  }).optional(),
})

export const updateSubUserSchema = z.object({
  email: z.string().email().optional(),
  nombre: z.string().min(1).max(100).optional(),
  password: z.string().min(6).optional(),
  activo: z.boolean().optional(),
  permisos: z.object({
    ver_dashboard: z.boolean(),
    ver_transacciones: z.boolean(),
    crear_transacciones: z.boolean(),
    editar_transacciones: z.boolean(),
    eliminar_transacciones: z.boolean(),
    ver_catalogo: z.boolean(),
    editar_catalogo: z.boolean(),
    ver_gastos_fijos: z.boolean(),
    editar_gastos_fijos: z.boolean(),
    ver_ingresos_fijos: z.boolean(),
    editar_ingresos_fijos: z.boolean(),
    ver_configuracion: z.boolean(),
  }).partial().optional(),
})

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nombre: z.string().min(1).max(100),
  rol: z.enum(["ADMIN", "USER", "SUB_USER"]),
  parent_id: z.number().int().positive().optional(),
  permisos: z.object({
    ver_dashboard: z.boolean().default(true),
    ver_transacciones: z.boolean().default(true),
    crear_transacciones: z.boolean().default(false),
    editar_transacciones: z.boolean().default(false),
    eliminar_transacciones: z.boolean().default(false),
    ver_catalogo: z.boolean().default(true),
    editar_catalogo: z.boolean().default(false),
    ver_gastos_fijos: z.boolean().default(true),
    editar_gastos_fijos: z.boolean().default(false),
    ver_ingresos_fijos: z.boolean().default(true),
    editar_ingresos_fijos: z.boolean().default(false),
    ver_configuracion: z.boolean().default(false),
  }).optional(),
})

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  nombre: z.string().min(1).max(100).optional(),
  password: z.string().min(6).optional(),
  rol: z.enum(["ADMIN", "USER", "SUB_USER"]).optional(),
  activo: z.boolean().optional(),
  max_sub_users: z.number().int().min(0).optional(),
  parent_id: z.number().int().positive().nullable().optional(),
  permisos: z.object({
    ver_dashboard: z.boolean(),
    ver_transacciones: z.boolean(),
    crear_transacciones: z.boolean(),
    editar_transacciones: z.boolean(),
    eliminar_transacciones: z.boolean(),
    ver_catalogo: z.boolean(),
    editar_catalogo: z.boolean(),
    ver_gastos_fijos: z.boolean(),
    editar_gastos_fijos: z.boolean(),
    ver_ingresos_fijos: z.boolean(),
    editar_ingresos_fijos: z.boolean(),
    ver_configuracion: z.boolean(),
  }).partial().optional(),
})

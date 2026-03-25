import {
  mysqlTable,
  int,
  varchar,
  decimal,
  date,
  text,
  timestamp,
  mysqlEnum,
  index,
  check,
  boolean,
} from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const usuarios = mysqlTable("usuarios", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  rol: mysqlEnum("rol", ["ADMIN", "USER", "SUB_USER"]).notNull().default("USER"),
  activo: boolean("activo").notNull().default(true),
  parent_id: int("parent_id"),
  max_sub_users: int("max_sub_users").notNull().default(3),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow(),
})

export const permisos_subusuario = mysqlTable("permisos_subusuario", {
  id: int("id").autoincrement().primaryKey(),
  usuario_id: int("usuario_id")
    .notNull()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  ver_dashboard: boolean("ver_dashboard").notNull().default(true),
  ver_transacciones: boolean("ver_transacciones").notNull().default(true),
  crear_transacciones: boolean("crear_transacciones").notNull().default(false),
  editar_transacciones: boolean("editar_transacciones").notNull().default(false),
  eliminar_transacciones: boolean("eliminar_transacciones").notNull().default(false),
  ver_catalogo: boolean("ver_catalogo").notNull().default(true),
  editar_catalogo: boolean("editar_catalogo").notNull().default(false),
  ver_gastos_fijos: boolean("ver_gastos_fijos").notNull().default(true),
  editar_gastos_fijos: boolean("editar_gastos_fijos").notNull().default(false),
  ver_ingresos_fijos: boolean("ver_ingresos_fijos").notNull().default(true),
  editar_ingresos_fijos: boolean("editar_ingresos_fijos").notNull().default(false),
  ver_configuracion: boolean("ver_configuracion").notNull().default(false),
})

export const categorias = mysqlTable("categorias", {
  id: int("id").autoincrement().primaryKey(),
  user_id: int("user_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
})

export const subcategorias = mysqlTable("subcategorias", {
  id: int("id").autoincrement().primaryKey(),
  user_id: int("user_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
})

export const entidades = mysqlTable("entidades", {
  id: int("id").autoincrement().primaryKey(),
  user_id: int("user_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
})

export const transacciones = mysqlTable(
  "transacciones",
  {
    id: int("id").autoincrement().primaryKey(),
    user_id: int("user_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
    categoria_id: int("categoria_id").notNull().references(() => categorias.id),
    subcategoria_id: int("subcategoria_id").notNull().references(() => subcategorias.id),
    entidad_id: int("entidad_id").notNull().references(() => entidades.id),
    tipo: mysqlEnum("tipo", ["GASTO", "INGRESO"]).notNull(),
    monto: decimal("monto", { precision: 12, scale: 2 }).notNull(),
    fecha: date("fecha").notNull(),
    notas: text("notas"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_user_fecha").on(table.user_id, table.fecha),
    index("idx_fecha").on(table.fecha),
    index("idx_tipo").on(table.tipo),
    index("idx_categoria").on(table.categoria_id),
    index("idx_subcategoria").on(table.subcategoria_id),
    index("idx_entidad").on(table.entidad_id),
    check("monto_positivo", sql`${table.monto} > 0`),
  ]
)

export const gastos_fijos = mysqlTable("gastos_fijos", {
  id: int("id").autoincrement().primaryKey(),
  user_id: int("user_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  concepto: varchar("concepto", { length: 255 }).notNull(),
  monto_anual: decimal("monto_anual", { precision: 12, scale: 2 }),
  monto_mensual: decimal("monto_mensual", { precision: 12, scale: 2 }),
  entidad_id: int("entidad_id").references(() => entidades.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow(),
})

export const ingresos_fijos = mysqlTable("ingresos_fijos", {
  id: int("id").autoincrement().primaryKey(),
  user_id: int("user_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  concepto: varchar("concepto", { length: 255 }).notNull(),
  monto_anual: decimal("monto_anual", { precision: 12, scale: 2 }),
  monto_mensual: decimal("monto_mensual", { precision: 12, scale: 2 }),
  entidad_id: int("entidad_id").references(() => entidades.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow(),
})

export const configuracion = mysqlTable("configuracion", {
  id: int("id").autoincrement().primaryKey(),
  user_id: int("user_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }).unique(),
  anio: int("anio").notNull().default(2025),
  iva: decimal("iva", { precision: 5, scale: 2 }).notNull().default("21.00"),
  moneda: varchar("moneda", { length: 5 }).notNull().default("€"),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow(),
})

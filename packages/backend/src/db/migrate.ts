import "../env"
import mysql from "mysql2/promise"

async function main() {
  const host = process.env.DATABASE_HOST ?? "localhost"
  const port = Number(process.env.DATABASE_PORT ?? 3306)
  const user = process.env.DATABASE_USER ?? "root"
  const password = process.env.DATABASE_PASSWORD ?? ""
  const database = process.env.DATABASE_NAME ?? "finza"

  // Create the database if it doesn't exist
  const initConn = await mysql.createConnection({ host, port, user, password })
  await initConn.execute(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  await initConn.end()
  console.log(`✓ Database "${database}" ready`)

  const conn = await mysql.createConnection({ host, port, user, password, database })

  // ─── Auth tables ───────────────────────────────────────────────
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      nombre VARCHAR(100) NOT NULL,
      rol ENUM('ADMIN', 'USER', 'SUB_USER') NOT NULL DEFAULT 'USER',
      activo BOOLEAN NOT NULL DEFAULT TRUE,
      parent_id INT DEFAULT NULL,
      max_sub_users INT NOT NULL DEFAULT 3,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)
  console.log("✓ usuarios")

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS permisos_subusuario (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT NOT NULL,
      ver_dashboard BOOLEAN NOT NULL DEFAULT TRUE,
      ver_transacciones BOOLEAN NOT NULL DEFAULT TRUE,
      crear_transacciones BOOLEAN NOT NULL DEFAULT FALSE,
      editar_transacciones BOOLEAN NOT NULL DEFAULT FALSE,
      eliminar_transacciones BOOLEAN NOT NULL DEFAULT FALSE,
      ver_catalogo BOOLEAN NOT NULL DEFAULT TRUE,
      editar_catalogo BOOLEAN NOT NULL DEFAULT FALSE,
      ver_gastos_fijos BOOLEAN NOT NULL DEFAULT TRUE,
      editar_gastos_fijos BOOLEAN NOT NULL DEFAULT FALSE,
      ver_ingresos_fijos BOOLEAN NOT NULL DEFAULT TRUE,
      editar_ingresos_fijos BOOLEAN NOT NULL DEFAULT FALSE,
      ver_configuracion BOOLEAN NOT NULL DEFAULT FALSE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `)
  console.log("✓ permisos_subusuario")

  // ─── Catalog tables ────────────────────────────────────────────
  for (const table of ["categorias", "subcategorias", "entidades"]) {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `)
    console.log(`✓ ${table}`)
  }

  // ─── Transacciones ─────────────────────────────────────────────
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS transacciones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      categoria_id INT NOT NULL,
      subcategoria_id INT NOT NULL,
      entidad_id INT NOT NULL,
      tipo ENUM('GASTO', 'INGRESO') NOT NULL,
      monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
      fecha DATE NOT NULL,
      notas TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id),
      FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id),
      FOREIGN KEY (entidad_id) REFERENCES entidades(id),
      INDEX idx_user_fecha (user_id, fecha),
      INDEX idx_fecha (fecha),
      INDEX idx_tipo (tipo),
      INDEX idx_categoria (categoria_id),
      INDEX idx_subcategoria (subcategoria_id),
      INDEX idx_entidad (entidad_id)
    )
  `)
  console.log("✓ transacciones")

  // ─── Fixed expenses/income ─────────────────────────────────────
  for (const table of ["gastos_fijos", "ingresos_fijos"]) {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        concepto VARCHAR(255) NOT NULL,
        monto_anual DECIMAL(12,2) DEFAULT NULL,
        monto_mensual DECIMAL(12,2) DEFAULT NULL,
        entidad_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (entidad_id) REFERENCES entidades(id)
      )
    `)
    console.log(`✓ ${table}`)
  }

  // ─── Configuracion ─────────────────────────────────────────────
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS configuracion (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      anio INT NOT NULL DEFAULT ${new Date().getFullYear()},
      iva DECIMAL(5,2) NOT NULL DEFAULT 21.00,
      moneda VARCHAR(5) NOT NULL DEFAULT '€',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE INDEX idx_conf_user_id (user_id),
      FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `)
  console.log("✓ configuracion")

  console.log("\nMigration complete!")
  console.log("Next: bun run db:create-admin <email> <password> [nombre]")

  await conn.end()
  process.exit(0)
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})

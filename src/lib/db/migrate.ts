import dotenv from "dotenv"
import path from "path"
import { existsSync } from "fs"
import mysql from "mysql2/promise"
import { drizzle } from "drizzle-orm/mysql2"
import { migrate } from "drizzle-orm/mysql2/migrator"

const envPath = path.resolve(process.cwd(), ".env")
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const dbName = process.env.DATABASE_NAME ?? "finza"

async function main() {
  const basePool = mysql.createPool({
    host: process.env.DATABASE_HOST ?? "localhost",
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER ?? "root",
    password: process.env.DATABASE_PASSWORD ?? "",
    waitForConnections: true,
    connectionLimit: 2,
  })

  console.log(`Creating database "${dbName}" if not exists...`)
  await basePool.execute(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  await basePool.end()

  const pool = mysql.createPool({
    host: process.env.DATABASE_HOST ?? "localhost",
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER ?? "root",
    password: process.env.DATABASE_PASSWORD ?? "",
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
  })

  const db = drizzle(pool, { mode: "default" })

  console.log("Running migrations...")
  await migrate(db, { migrationsFolder: "./drizzle" })
  console.log("Migrations complete.")

  await pool.end()
  process.exit(0)
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})

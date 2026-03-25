import dotenv from "dotenv"
import path from "path"
import { existsSync } from "fs"
import { drizzle } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"
import * as schema from "./schema"

const envPath = path.resolve(process.cwd(), ".env")
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER ?? "root",
  password: process.env.DATABASE_PASSWORD ?? "",
  database: process.env.DATABASE_NAME ?? "finza",
  waitForConnections: true,
  connectionLimit: 10,
})

export const db = drizzle(pool, { schema, mode: "default" })
export { pool }

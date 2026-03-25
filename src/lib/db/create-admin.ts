import { db, pool } from "./connection"
import { usuarios, configuracion } from "./schema"
import bcrypt from "bcryptjs"

async function main() {
  const email = process.argv[2] ?? "admin@finza.app"
  const password = process.argv[3] ?? "admin123"
  const nombre = process.argv[4] ?? "Administrador"

  const hash = await bcrypt.hash(password, 12)

  const [result] = await db.insert(usuarios).values({
    email,
    password_hash: hash,
    nombre,
    rol: "ADMIN",
  })

  await db.insert(configuracion).values({
    user_id: result.insertId,
    anio: new Date().getFullYear(),
    iva: "21.00",
    moneda: "€",
  })

  console.log(`Admin created: ${email} (id: ${result.insertId})`)
  await pool.end()
  process.exit(0)
}

main().catch((err) => {
  console.error("Failed:", err)
  process.exit(1)
})

import "../env"
import { db, pool } from "./connection"
import { usuarios, configuracion } from "./schema"
import { hashPassword } from "../lib/auth"
import { eq } from "drizzle-orm"

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]
  const nombre = process.argv[4] ?? "Administrador"

  if (!email || !password) {
    console.error("Uso: bun run src/db/create-admin.ts <email> <password> [nombre]")
    console.error("Ejemplo: bun run src/db/create-admin.ts admin@finza.app 123456 Admin")
    process.exit(1)
  }

  if (password.length < 6) {
    console.error("Error: La contraseña debe tener al menos 6 caracteres")
    process.exit(1)
  }

  // Check if email already exists
  const [existing] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1)

  if (existing) {
    console.error(`Error: Ya existe un usuario con el email ${email}`)
    process.exit(1)
  }

  const password_hash = await hashPassword(password)

  const [result] = await db.insert(usuarios).values({
    email,
    password_hash,
    nombre,
    rol: "ADMIN",
    activo: true,
  })

  const userId = result.insertId

  // Create default config for this user
  await db.insert(configuracion).values({
    user_id: userId,
    anio: new Date().getFullYear(),
    iva: "21.00",
    moneda: "€",
  })

  console.log(`Admin creado exitosamente:`)
  console.log(`  ID: ${userId}`)
  console.log(`  Email: ${email}`)
  console.log(`  Nombre: ${nombre}`)
  console.log(`  Rol: ADMIN`)

  await (pool as any).end()
  process.exit(0)
}

main().catch((err) => {
  console.error("Error:", err.message)
  process.exit(1)
})

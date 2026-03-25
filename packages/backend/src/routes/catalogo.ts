import { Hono } from "hono"
import { db } from "../db/connection"
import { categorias, subcategorias, entidades, transacciones } from "../db/schema"
import { eq, and, count, sql } from "drizzle-orm"
import { z } from "zod"

const nombreSchema = z.object({ nombre: z.string().min(1).max(100) })

function createCatalogoRoutes(
  table: typeof categorias | typeof subcategorias | typeof entidades,
  fkColumn: "categoria_id" | "subcategoria_id" | "entidad_id"
) {
  const app = new Hono()

  // GET / — list all (filtered by user_id)
  app.get("/", async (c) => {
    const userId = c.get("user").parentUserId
    const rows = await db
      .select()
      .from(table)
      .where(eq(table.user_id, userId))
      .orderBy(table.nombre)
    return c.json(rows)
  })

  // POST / — create (with user_id)
  app.post("/", async (c) => {
    const userId = c.get("user").parentUserId
    const body = await c.req.json()
    const parsed = nombreSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: "Nombre inválido", details: parsed.error.flatten() }, 400)
    }
    try {
      const [result] = await db
        .insert(table)
        .values({ nombre: parsed.data.nombre, user_id: userId })
      return c.json({ id: result.insertId, nombre: parsed.data.nombre }, 201)
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        return c.json({ error: "Ya existe un registro con ese nombre" }, 409)
      }
      throw err
    }
  })

  // PUT /:id — rename (only if belongs to user)
  app.put("/:id", async (c) => {
    const userId = c.get("user").parentUserId
    const id = Number(c.req.param("id"))
    const body = await c.req.json()
    const parsed = nombreSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: "Nombre inválido", details: parsed.error.flatten() }, 400)
    }
    try {
      await db
        .update(table)
        .set({ nombre: parsed.data.nombre })
        .where(and(eq(table.id, id), eq(table.user_id, userId)))
      return c.json({ id, nombre: parsed.data.nombre })
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        return c.json({ error: "Ya existe un registro con ese nombre" }, 409)
      }
      throw err
    }
  })

  // DELETE /:id — delete (only if belongs to user, 409 if user's transactions exist)
  app.delete("/:id", async (c) => {
    const userId = c.get("user").parentUserId
    const id = Number(c.req.param("id"))
    const [rows] = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM transacciones WHERE ${sql.raw(fkColumn)} = ${id} AND user_id = ${userId}`
    )
    const cnt = Number((rows as unknown as any[])[0].cnt)
    if (cnt > 0) {
      return c.json(
        { error: `No se puede eliminar: hay ${cnt} transacciones asociadas` },
        409
      )
    }
    await db.delete(table).where(and(eq(table.id, id), eq(table.user_id, userId)))
    return c.json({ ok: true })
  })

  // GET /:id/count — count user's transactions using this item
  app.get("/:id/count", async (c) => {
    const userId = c.get("user").parentUserId
    const id = Number(c.req.param("id"))
    const [rows] = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM transacciones WHERE ${sql.raw(fkColumn)} = ${id} AND user_id = ${userId}`
    )
    return c.json({ count: Number((rows as unknown as any[])[0].cnt) })
  })

  return app
}

export const categoriasRoutes = createCatalogoRoutes(categorias, "categoria_id")
export const subcategoriasRoutes = createCatalogoRoutes(subcategorias, "subcategoria_id")
export const entidadesRoutes = createCatalogoRoutes(entidades, "entidad_id")

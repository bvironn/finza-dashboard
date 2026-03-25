import type { APIRoute } from "astro"
import { db } from "@/lib/db/connection"
import { sql } from "drizzle-orm"
import { withAuth, json } from "@/lib/middleware"

export const GET: APIRoute = async ({ request, params }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  const id = Number(params.id)

  const rows = await db.execute(
    sql`SELECT COUNT(*) as cnt FROM transacciones WHERE categoria_id = ${id} AND user_id = ${auth.user.parentUserId}`
  )
  return json({ count: Number((rows[0] as unknown as any[])[0].cnt) })
}

import type { APIRoute } from "astro"
import { db } from "@/lib/db/connection"
import { usuarios } from "@/lib/db/schema"
import { eq, and, count } from "drizzle-orm"
import { withAuth, json } from "@/lib/middleware"

export const GET: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response
  if (auth.user.rol === "SUB_USER") return json({ error: "Sin permisos" }, 403)

  const [user] = await db
    .select({ max_sub_users: usuarios.max_sub_users })
    .from(usuarios)
    .where(eq(usuarios.id, auth.user.userId))
    .limit(1)

  const [countResult] = await db
    .select({ count: count() })
    .from(usuarios)
    .where(and(eq(usuarios.parent_id, auth.user.userId), eq(usuarios.rol, "SUB_USER")))

  return json({ max: user?.max_sub_users ?? 3, current: countResult?.count ?? 0 })
}

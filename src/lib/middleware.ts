import { verifyToken, type JWTPayload } from "./auth"
import { db } from "./db/connection"
import { usuarios, permisos_subusuario } from "./db/schema"
import { eq } from "drizzle-orm"

export interface AuthResult {
  userId: number
  email: string
  rol: "ADMIN" | "USER" | "SUB_USER"
  parentUserId: number
  permisos: Record<string, boolean> | null
}

export async function withAuth(request: Request): Promise<
  { ok: true; user: AuthResult } | { ok: false; response: Response }
> {
  const header = request.headers.get("Authorization")
  if (!header?.startsWith("Bearer ")) {
    return { ok: false, response: json({ error: "Token requerido" }, 401) }
  }

  try {
    const token = header.slice(7)
    const payload = await verifyToken(token)

    const [user] = await db
      .select({ activo: usuarios.activo, parent_id: usuarios.parent_id })
      .from(usuarios)
      .where(eq(usuarios.id, payload.userId))
      .limit(1)

    if (!user || !user.activo) {
      return { ok: false, response: json({ error: "Usuario desactivado" }, 401) }
    }

    const parentUserId =
      payload.rol === "SUB_USER" && user.parent_id
        ? user.parent_id
        : payload.userId

    let permisos: Record<string, boolean> | null = null
    if (payload.rol === "SUB_USER") {
      const [perms] = await db
        .select()
        .from(permisos_subusuario)
        .where(eq(permisos_subusuario.usuario_id, payload.userId))
        .limit(1)
      if (perms) {
        const { id: _id, usuario_id: _uid, ...rest } = perms
        permisos = rest as Record<string, boolean>
      }
    }

    return {
      ok: true,
      user: { ...payload, parentUserId, permisos },
    }
  } catch {
    return { ok: false, response: json({ error: "Token inválido o expirado" }, 401) }
  }
}

export function requirePermission(user: AuthResult, permiso: string): Response | null {
  if (user.rol === "ADMIN" || user.rol === "USER") return null
  if (user.permisos && user.permisos[permiso]) return null
  return json({ error: "Sin permisos para esta acción" }, 403)
}

export function requireAdmin(user: AuthResult): Response | null {
  if (user.rol !== "ADMIN") {
    return json({ error: "Se requiere rol de administrador" }, 403)
  }
  return null
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

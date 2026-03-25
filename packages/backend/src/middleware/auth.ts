import type { Context, Next } from "hono"
import { verifyToken, type JWTPayload } from "../lib/auth"
import { db } from "../db/connection"
import { usuarios, permisos_subusuario } from "../db/schema"
import { eq } from "drizzle-orm"

// Extend Hono context with user info
declare module "hono" {
  interface ContextVariableMap {
    user: JWTPayload & { parentUserId: number }
    permisos: Record<string, boolean> | null
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const header = c.req.header("Authorization")
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Token requerido" }, 401)
  }

  try {
    const token = header.slice(7)
    const payload = await verifyToken(token)

    // Check user still active
    const [user] = await db
      .select({ activo: usuarios.activo, parent_id: usuarios.parent_id })
      .from(usuarios)
      .where(eq(usuarios.id, payload.userId))
      .limit(1)

    if (!user || !user.activo) {
      return c.json({ error: "Usuario desactivado" }, 401)
    }

    // For data isolation: SUB_USER sees parent's data, USER/ADMIN see their own
    const parentUserId =
      payload.rol === "SUB_USER" && user.parent_id
        ? user.parent_id
        : payload.userId

    c.set("user", { ...payload, parentUserId })

    // Load permissions for SUB_USER
    if (payload.rol === "SUB_USER") {
      const [perms] = await db
        .select()
        .from(permisos_subusuario)
        .where(eq(permisos_subusuario.usuario_id, payload.userId))
        .limit(1)
      if (perms) {
        const { id: _id, usuario_id: _uid, ...rest } = perms
        c.set("permisos", rest as Record<string, boolean>)
      } else {
        c.set("permisos", null)
      }
    } else {
      c.set("permisos", null)
    }

    await next()
  } catch {
    return c.json({ error: "Token inválido o expirado" }, 401)
  }
}

// Helper: check if user has a specific permission
export function requirePermission(permiso: string) {
  return async (c: Context, next: Next) => {
    const user = c.get("user")
    if (user.rol === "ADMIN" || user.rol === "USER") {
      return next()
    }
    // SUB_USER: check specific permission
    const permisos = c.get("permisos")
    if (permisos && permisos[permiso]) {
      return next()
    }
    return c.json({ error: "Sin permisos para esta acción" }, 403)
  }
}

export async function requireAdmin(c: Context, next: Next) {
  const user = c.get("user")
  if (user.rol !== "ADMIN") {
    return c.json({ error: "Se requiere rol de administrador" }, 403)
  }
  return next()
}

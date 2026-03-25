import type { APIRoute } from "astro"
import { getDesglose } from "@/lib/calculos"
import { withAuth, json } from "@/lib/middleware"

const VALID_DIMENSIONS = ["categorias", "subcategorias", "entidades"] as const

export const GET: APIRoute = async ({ request, params }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const dimension = params.dimension as string
  if (!VALID_DIMENSIONS.includes(dimension as any)) {
    return json({ error: "Dimensión inválida" }, 400)
  }

  const url = new URL(request.url)
  const anio = Number(url.searchParams.get("anio") || new Date().getFullYear())
  const mes = url.searchParams.get("mes") ? Number(url.searchParams.get("mes")) : null

  const data = await getDesglose(dimension as any, anio, auth.user.parentUserId, mes)
  return json(data)
}

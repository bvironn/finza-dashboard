import type { APIRoute } from "astro"
import { getResumenMensualConProyeccion } from "@/lib/calculos"
import { withAuth, json } from "@/lib/middleware"

export const GET: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const anio = Number(url.searchParams.get("anio") || new Date().getFullYear())
  const data = await getResumenMensualConProyeccion(anio, auth.user.parentUserId)
  return json(data)
}

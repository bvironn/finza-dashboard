import type { APIRoute } from "astro"
import { getTotalesConProyeccion, getTotalesMes } from "@/lib/calculos"
import { withAuth, json } from "@/lib/middleware"

export const GET: APIRoute = async ({ request }) => {
  const auth = await withAuth(request)
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const anio = Number(url.searchParams.get("anio") || new Date().getFullYear())
  const mes = url.searchParams.get("mes") ? Number(url.searchParams.get("mes")) : null

  if (mes) {
    const data = await getTotalesMes(anio, mes, auth.user.parentUserId)
    return json(data)
  }
  const data = await getTotalesConProyeccion(anio, auth.user.parentUserId)
  return json(data)
}

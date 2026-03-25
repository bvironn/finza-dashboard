import { Hono } from "hono"
import {
  getTotalesConProyeccion,
  getResumenMensualConProyeccion,
  getDesglose,
  getTotalesMes,
} from "../lib/calculos"

const app = new Hono()

// GET /totales?anio=2025&mes=3
app.get("/totales", async (c) => {
  const anio = Number(c.req.query("anio") || new Date().getFullYear())
  const mes = c.req.query("mes") ? Number(c.req.query("mes")) : null
  const userId = c.get("user").parentUserId
  if (mes) {
    const data = await getTotalesMes(anio, mes, userId)
    return c.json(data)
  }
  const data = await getTotalesConProyeccion(anio, userId)
  return c.json(data)
})

// GET /resumen-mensual?anio=2025
app.get("/resumen-mensual", async (c) => {
  const anio = Number(c.req.query("anio") || new Date().getFullYear())
  const userId = c.get("user").parentUserId
  const data = await getResumenMensualConProyeccion(anio, userId)
  return c.json(data)
})

// GET /desglose/categorias?anio=2025&mes=3
app.get("/desglose/categorias", async (c) => {
  const anio = Number(c.req.query("anio") || new Date().getFullYear())
  const mes = c.req.query("mes") ? Number(c.req.query("mes")) : null
  const userId = c.get("user").parentUserId
  const data = await getDesglose("categorias", anio, userId, mes)
  return c.json(data)
})

app.get("/desglose/subcategorias", async (c) => {
  const anio = Number(c.req.query("anio") || new Date().getFullYear())
  const mes = c.req.query("mes") ? Number(c.req.query("mes")) : null
  const userId = c.get("user").parentUserId
  const data = await getDesglose("subcategorias", anio, userId, mes)
  return c.json(data)
})

app.get("/desglose/entidades", async (c) => {
  const anio = Number(c.req.query("anio") || new Date().getFullYear())
  const mes = c.req.query("mes") ? Number(c.req.query("mes")) : null
  const userId = c.get("user").parentUserId
  const data = await getDesglose("entidades", anio, userId, mes)
  return c.json(data)
})

export const dashboardRoutes = app

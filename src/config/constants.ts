export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const

export const MESES_CORTO = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
] as const

export const MONEDAS = [
  { value: "€", label: "€ EUR — Euro" },
  { value: "$", label: "$ USD — Dólar estadounidense" },
  { value: "CLP$", label: "CLP$ — Peso chileno" },
] as const

export const MONEDAS_SIN_DECIMALES = ["CLP$"] as const

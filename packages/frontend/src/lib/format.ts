const MONEDAS_SIN_DECIMALES = ["CLP$"]

export function formatMonto(monto: number, moneda = "€"): string {
  const sinDecimales = MONEDAS_SIN_DECIMALES.includes(moneda)
  const formatted = new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: sinDecimales ? 0 : 2,
    maximumFractionDigits: sinDecimales ? 0 : 2,
  }).format(Math.abs(sinDecimales ? Math.round(monto) : monto))
  return `${moneda}${formatted}`
}

export function balanceColor(balance: number): string {
  if (balance > 0) return "text-emerald-700 dark:text-emerald-400"
  if (balance < 0) return "text-red-700 dark:text-red-400"
  return "text-muted-foreground"
}

export function balanceBg(balance: number): string {
  if (balance > 0) return "bg-emerald-100/60 dark:bg-emerald-950/40"
  if (balance < 0) return "bg-red-100/60 dark:bg-red-950/40"
  return ""
}

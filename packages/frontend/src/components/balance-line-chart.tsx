import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import type { ResumenMes } from "@/lib/types"

export function BalanceLineChart({ data, moneda }: { data: ResumenMes[]; moneda: string }) {
  let acumulado = 0
  const chartData = data.map((m) => {
    acumulado += m.balance
    return {
      name: m.nombre.substring(0, 3),
      Balance: acumulado,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis className="text-xs" tickFormatter={(v) => `${moneda}${(v / 1000).toFixed(1)}k`} />
        <Tooltip
          formatter={(value) =>
            new Intl.NumberFormat("es-ES", { style: "decimal", minimumFractionDigits: 2 }).format(Number(value))
          }
        />
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
        <Line
          type="monotone"
          dataKey="Balance"
          stroke="hsl(217, 91%, 60%)"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

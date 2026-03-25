import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import type { ResumenMes } from "@/types"

export function MonthlyChart({ data, moneda }: { data: ResumenMes[]; moneda: string }) {
  const chartData = data.map((m) => ({
    name: m.nombre.substring(0, 3),
    Ingresos: m.ingresos,
    Gastos: m.gastos,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis className="text-xs" tickFormatter={(v) => `${moneda}${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value) =>
            new Intl.NumberFormat("es-ES", { style: "decimal", minimumFractionDigits: 2 }).format(Number(value))
          }
          labelFormatter={(label) => String(label)}
        />
        <Legend />
        <Bar dataKey="Ingresos" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Gastos" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

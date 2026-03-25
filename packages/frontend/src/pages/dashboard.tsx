import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import {
  TrendingUpIcon,
  TrendingDownIcon,
  WalletIcon,
} from "lucide-react"
import { usePeriodo } from "@/lib/periodo-context"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { formatMonto, balanceColor, balanceBg } from "@/lib/format"
import { MonthlyChart } from "@/components/monthly-chart"
import { BalanceLineChart } from "@/components/balance-line-chart"
import type { DesgloseDimension } from "@/lib/types"

const MESES_NOMBRE = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export function DashboardPage() {
  const { anio, mes } = usePeriodo()
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: api.getConfig,
  })

  const moneda = config?.moneda ?? "€"

  const { data: totales, isLoading: loadingTotales } = useQuery({
    queryKey: ["dashboard", "totales", anio, mes],
    queryFn: () => api.getTotales(anio, mes),
    enabled: !!anio,
  })

  const { data: resumen, isLoading: loadingResumen } = useQuery({
    queryKey: ["dashboard", "resumen-mensual", anio],
    queryFn: () => api.getResumenMensual(anio),
    enabled: !!anio,
  })

  const { data: desgloseCat } = useQuery({
    queryKey: ["dashboard", "desglose", "categorias", anio, mes],
    queryFn: () => api.getDesglose("categorias", anio, mes),
    enabled: !!anio,
  })

  const { data: desgloseSub } = useQuery({
    queryKey: ["dashboard", "desglose", "subcategorias", anio, mes],
    queryFn: () => api.getDesglose("subcategorias", anio, mes),
    enabled: !!anio,
  })

  const { data: desgloseEnt } = useQuery({
    queryKey: ["dashboard", "desglose", "entidades", anio, mes],
    queryFn: () => api.getDesglose("entidades", anio, mes),
    enabled: !!anio,
  })

  // Filter resumen to selected month if applicable
  const filteredResumen = mes ? resumen?.filter((m) => m.mes === mes) : resumen

  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold">
        Dashboard — {mes ? `${MESES_NOMBRE[mes - 1]} ${anio}` : anio}
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KPICard
          title="Total Ingresos"
          value={totales?.ingresos}
          moneda={moneda}
          icon={<TrendingUpIcon className="text-emerald-600" />}
          loading={loadingTotales}
          className="border-emerald-200 dark:border-emerald-900"
        />
        <KPICard
          title="Total Gastos"
          value={totales?.gastos}
          moneda={moneda}
          icon={<TrendingDownIcon className="text-red-600" />}
          loading={loadingTotales}
          className="border-red-200 dark:border-red-900"
        />
        <KPICard
          title="Balance Neto"
          value={totales?.balance}
          moneda={moneda}
          icon={<WalletIcon />}
          loading={loadingTotales}
          className={totales ? (totales.balance >= 0 ? "border-emerald-200 dark:border-emerald-900" : "border-red-200 dark:border-red-900") : ""}
          valueClass={totales ? balanceColor(totales.balance) : ""}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos vs Gastos por Mes</CardTitle>
            <CardDescription>Comparativa mensual {anio}</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredResumen ? <MonthlyChart data={filteredResumen} moneda={moneda} /> : <Skeleton className="h-[300px]" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Balance Acumulado</CardTitle>
            <CardDescription>Evolución del balance mensual</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredResumen ? <BalanceLineChart data={filteredResumen} moneda={moneda} /> : <Skeleton className="h-[300px]" />}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingResumen ? (
            <Skeleton className="h-[400px]" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResumen?.map((mes) => (
                  <TableRow
                    key={mes.mes}
                    className={`cursor-pointer hover:bg-muted/50 ${mes.proyectado ? "opacity-60 italic" : ""}`}
                    onClick={() => navigate(`/transacciones?mes=${mes.mes}`)}
                  >
                    <TableCell className="font-medium">
                      {mes.nombre}
                      {mes.proyectado && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(proy.)</span>}
                    </TableCell>
                    <TableCell className="text-right">{formatMonto(mes.ingresos, moneda)}</TableCell>
                    <TableCell className="text-right">{formatMonto(mes.gastos, moneda)}</TableCell>
                    <TableCell className={`text-right font-medium ${balanceColor(mes.balance)} ${balanceBg(mes.balance)} rounded`}>
                      {formatMonto(mes.balance, moneda)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {totales && (
                <TableFooter>
                  <TableRow className="font-semibold">
                    <TableCell>Total {anio}</TableCell>
                    <TableCell className="text-right">{formatMonto(totales.ingresos, moneda)}</TableCell>
                    <TableCell className="text-right">{formatMonto(totales.gastos, moneda)}</TableCell>
                    <TableCell className={`text-right ${balanceColor(totales.balance)}`}>
                      {formatMonto(totales.balance, moneda)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Breakdown Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Desglose</CardTitle>
          <CardDescription>Por categoría, subcategoría y entidad</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="categorias">
            <TabsList>
              <TabsTrigger value="categorias">Categorías</TabsTrigger>
              <TabsTrigger value="subcategorias">Subcategorías</TabsTrigger>
              <TabsTrigger value="entidades">Entidades</TabsTrigger>
            </TabsList>
            <TabsContent value="categorias">
              <DesgloseTable data={desgloseCat} moneda={moneda} />
            </TabsContent>
            <TabsContent value="subcategorias">
              <DesgloseTable data={desgloseSub} moneda={moneda} />
            </TabsContent>
            <TabsContent value="entidades">
              <DesgloseTable data={desgloseEnt} moneda={moneda} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function KPICard({
  title,
  value,
  moneda,
  icon,
  loading,
  className = "",
  valueClass = "",
}: {
  title: string
  value?: number
  moneda: string
  icon: React.ReactNode
  loading: boolean
  className?: string
  valueClass?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <p className={`text-2xl font-bold ${valueClass}`}>
            {value !== undefined ? formatMonto(value, moneda) : "—"}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function DesgloseTable({ data, moneda }: { data?: DesgloseDimension[]; moneda: string }) {
  if (!data) return <Skeleton className="h-[200px]" />

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead className="text-right">Gastos</TableHead>
          <TableHead className="text-right">Ingresos</TableHead>
          <TableHead className="text-right">Balance</TableHead>
          <TableHead className="text-right"># Trans.</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.nombre}</TableCell>
            <TableCell className="text-right">{formatMonto(item.gastos, moneda)}</TableCell>
            <TableCell className="text-right">{formatMonto(item.ingresos, moneda)}</TableCell>
            <TableCell className={`text-right font-medium ${balanceColor(item.balance)}`}>
              {formatMonto(item.balance, moneda)}
            </TableCell>
            <TableCell className="text-right">{item.transacciones}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

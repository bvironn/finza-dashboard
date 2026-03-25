import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PlusIcon, TrashIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { formatMonto } from "@/lib/format"

export function GastosFijosPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: config } = useQuery({ queryKey: ["config"], queryFn: api.getConfig })
  const moneda = config?.moneda ?? "€"

  const { data: gastosFijos } = useQuery({ queryKey: ["gastos-fijos"], queryFn: api.getGastosFijos })
  const { data: entidades } = useQuery({ queryKey: ["entidades"], queryFn: api.getEntidades })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteGastoFijo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gastos-fijos"] })
      toast.success("Gasto fijo eliminado")
    },
  })

  const totalMensual = gastosFijos?.reduce((acc, gf) => acc + (gf.monto_mensual ?? 0), 0) ?? 0
  const totalAnual = gastosFijos?.reduce((acc, gf) => acc + (gf.monto_anual ?? 0), 0) ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Gastos Fijos</h2>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Nuevo gasto fijo
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">Monto Mensual</TableHead>
                <TableHead className="text-right">Monto Anual</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead className="w-[80px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastosFijos?.map((gf) => (
                <TableRow key={gf.id}>
                  <TableCell className="font-medium">{gf.concepto}</TableCell>
                  <TableCell className="text-right font-mono">
                    {gf.monto_mensual != null ? formatMonto(gf.monto_mensual, moneda) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {gf.monto_anual != null ? formatMonto(gf.monto_anual, moneda) : "—"}
                  </TableCell>
                  <TableCell>{gf.entidad ?? "—"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(gf.id)}
                    >
                      <TrashIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{formatMonto(totalMensual, moneda)}</TableCell>
                <TableCell className="text-right">{formatMonto(totalAnual, moneda)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <NuevoGastoFijoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entidades={entidades ?? []}
      />

    </div>
  )
}

function NuevoGastoFijoDialog({
  open,
  onOpenChange,
  entidades,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  entidades: { id: number; nombre: string }[]
}) {
  const queryClient = useQueryClient()
  const [concepto, setConcepto] = useState("")
  const [montoAnual, setMontoAnual] = useState("")
  const [montoMensual, setMontoMensual] = useState("")
  const [entidadId, setEntidadId] = useState("")

  const mutation = useMutation({
    mutationFn: () =>
      api.createGastoFijo({
        concepto,
        monto_anual: montoAnual ? Number(montoAnual) : null,
        monto_mensual: montoMensual ? Number(montoMensual) : null,
        entidad_id: entidadId && entidadId !== "none" ? Number(entidadId) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gastos-fijos"] })
      toast.success("Gasto fijo creado")
      onOpenChange(false)
      setConcepto("")
      setMontoAnual("")
      setMontoMensual("")
      setEntidadId("")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleAnualChange = (v: string) => {
    setMontoAnual(v)
    if (v) setMontoMensual((Number(v) / 12).toFixed(2))
  }

  const handleMensualChange = (v: string) => {
    setMontoMensual(v)
    if (v) setMontoAnual((Number(v) * 12).toFixed(2))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo gasto fijo</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="gf-concepto">Concepto</Label>
            <Input
              id="gf-concepto"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="gf-anual">Monto Anual</Label>
              <Input
                id="gf-anual"
                type="number"
                step="0.01"
                value={montoAnual}
                onChange={(e) => handleAnualChange(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="gf-mensual">Monto Mensual</Label>
              <Input
                id="gf-mensual"
                type="number"
                step="0.01"
                value={montoMensual}
                onChange={(e) => handleMensualChange(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="gf-ent">Entidad</Label>
            <Select value={entidadId} onValueChange={setEntidadId}>
              <SelectTrigger id="gf-ent"><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="none">Sin entidad</SelectItem>
                  {entidades.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creando..." : "Crear"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}


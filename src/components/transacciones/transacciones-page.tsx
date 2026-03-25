import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectGroup, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { formatMonto, balanceColor } from "@/lib/format"
import { usePeriodo } from "@/lib/periodo-context"
import { MESES } from "@/config/constants"
import type { Transaccion, TransaccionInput } from "@/types"

export function TransaccionesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaccion | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const [tipo, setTipo] = useState("")
  const [categoriaId, setCategoriaId] = useState("")
  const [subcategoriaId, setSubcategoriaId] = useState("")
  const [entidadId, setEntidadId] = useState("")
  const [buscar, setBuscar] = useState("")

  const { anio, mes } = usePeriodo()
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: api.getConfig })
  const moneda = config?.moneda ?? "€"

  const { data: categorias } = useQuery({ queryKey: ["categorias"], queryFn: api.getCategorias })
  const { data: subcategorias } = useQuery({ queryKey: ["subcategorias"], queryFn: api.getSubcategorias })
  const { data: entidades } = useQuery({ queryKey: ["entidades"], queryFn: api.getEntidades })

  const queryParams: Record<string, string | number> = { anio, page, limit: 50 }
  if (mes) queryParams.mes = mes
  if (tipo && tipo !== "all") queryParams.tipo = tipo
  if (categoriaId && categoriaId !== "all") queryParams.categoria_id = categoriaId
  if (subcategoriaId && subcategoriaId !== "all") queryParams.subcategoria_id = subcategoriaId
  if (entidadId && entidadId !== "all") queryParams.entidad_id = entidadId
  if (buscar) queryParams.buscar = buscar

  const { data, isLoading } = useQuery({
    queryKey: ["transacciones", queryParams],
    queryFn: () => api.getTransacciones(queryParams),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteTransaccion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacciones"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      toast.success("Transacción eliminada")
      setDeleteId(null)
    },
  })

  const totalsFiltered = data?.data.reduce(
    (acc, tx) => {
      if (tx.tipo === "INGRESO") acc.ingresos += tx.monto
      else acc.gastos += tx.monto
      return acc
    },
    { ingresos: 0, gastos: 0 }
  ) ?? { ingresos: 0, gastos: 0 }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          Transacciones — {mes ? `${MESES[mes - 1]} ${anio}` : anio}
        </h2>
        <Button onClick={() => { setEditingTx(null); setDialogOpen(true) }}>
          <PlusIcon className="mr-1 size-4" />
          Nueva transacción
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="GASTO">Gasto</SelectItem>
            <SelectItem value="INGRESO">Ingreso</SelectItem>
          </SelectGroup></SelectContent>
        </Select>
        <Select value={categoriaId} onValueChange={setCategoriaId}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem value="all">Todas</SelectItem>
            {categorias?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
          </SelectGroup></SelectContent>
        </Select>
        <Select value={subcategoriaId} onValueChange={setSubcategoriaId}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Subcategoría" /></SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem value="all">Todas</SelectItem>
            {subcategorias?.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>)}
          </SelectGroup></SelectContent>
        </Select>
        <Select value={entidadId} onValueChange={setEntidadId}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Entidad" /></SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem value="all">Todas</SelectItem>
            {entidades?.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>)}
          </SelectGroup></SelectContent>
        </Select>
        <Input placeholder="Buscar en notas..." value={buscar} onChange={(e) => setBuscar(e.target.value)} className="w-[200px]" />
      </div>

      {isLoading ? <Skeleton className="h-[400px]" /> : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Subcategoría</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">{tx.fecha}</TableCell>
                    <TableCell>{tx.categoria}</TableCell>
                    <TableCell>{tx.subcategoria}</TableCell>
                    <TableCell>{tx.entidad}</TableCell>
                    <TableCell>
                      <Badge variant={tx.tipo === "INGRESO" ? "default" : "destructive"}>{tx.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatMonto(tx.monto, moneda)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">{tx.notas}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingTx(tx); setDialogOpen(true) }}><PencilIcon /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(tx.id)}><TrashIcon /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-medium">
                  <TableCell colSpan={5}>Totales filtrados</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="text-emerald-700 dark:text-emerald-400">+{formatMonto(totalsFiltered.ingresos, moneda)}</span>
                      <span className="text-red-700 dark:text-red-400">-{formatMonto(totalsFiltered.gastos, moneda)}</span>
                      <span className={balanceColor(totalsFiltered.ingresos - totalsFiltered.gastos)}>
                        ={formatMonto(totalsFiltered.ingresos - totalsFiltered.gastos, moneda)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell colSpan={2} className="text-right text-muted-foreground">{data?.total ?? 0} transacciones</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {data && data.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <span className="text-sm text-muted-foreground">Página {data.page} de {data.pages}</span>
              <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
            </div>
          )}
        </>
      )}

      <TransaccionDialog open={dialogOpen} onOpenChange={setDialogOpen} transaccion={editingTx}
        categorias={categorias ?? []} subcategorias={subcategorias ?? []} entidades={entidades ?? []} />

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TransaccionDialog({ open, onOpenChange, transaccion, categorias, subcategorias, entidades }: {
  open: boolean; onOpenChange: (open: boolean) => void; transaccion: Transaccion | null
  categorias: { id: number; nombre: string }[]; subcategorias: { id: number; nombre: string }[]; entidades: { id: number; nombre: string }[]
}) {
  const queryClient = useQueryClient()
  const isEdit = !!transaccion

  const [categoriaId, setCategoriaId] = useState("")
  const [subcategoriaId, setSubcategoriaId] = useState("")
  const [entidadId, setEntidadId] = useState("")
  const [tipo, setTipo] = useState<"GASTO" | "INGRESO">("GASTO")
  const [monto, setMonto] = useState("")
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0])
  const [notas, setNotas] = useState("")

  useEffect(() => {
    if (open && transaccion) {
      setCategoriaId(String(transaccion.categoria_id))
      setSubcategoriaId(String(transaccion.subcategoria_id))
      setEntidadId(String(transaccion.entidad_id))
      setTipo(transaccion.tipo)
      setMonto(String(transaccion.monto))
      setFecha(transaccion.fecha)
      setNotas(transaccion.notas ?? "")
    } else if (open) {
      setCategoriaId(""); setSubcategoriaId(""); setEntidadId("")
      setTipo("GASTO"); setMonto("")
      setFecha(new Date().toISOString().split("T")[0]); setNotas("")
    }
  }, [open, transaccion])

  const mutation = useMutation({
    mutationFn: (data: TransaccionInput) =>
      isEdit ? api.updateTransaccion(transaccion!.id, data) : api.createTransaccion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transacciones"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      toast.success(isEdit ? "Transacción actualizada" : "Transacción creada")
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      categoria_id: Number(categoriaId), subcategoria_id: Number(subcategoriaId),
      entidad_id: Number(entidadId), tipo, monto: Number(monto), fecha, notas: notas || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Editar transacción" : "Nueva transacción"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Categoría</Label>
              <Select value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  {categorias.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
                </SelectGroup></SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Subcategoría</Label>
              <Select value={subcategoriaId} onValueChange={setSubcategoriaId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  {subcategorias.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>)}
                </SelectGroup></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Entidad</Label>
              <Select value={entidadId} onValueChange={setEntidadId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  {entidades.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>)}
                </SelectGroup></SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as "GASTO" | "INGRESO")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem value="GASTO">Gasto</SelectItem>
                  <SelectItem value="INGRESO">Ingreso</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Monto</Label>
              <Input type="number" step="0.01" min="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Notas</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional..." rows={2} />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando..." : isEdit ? "Actualizar" : "Crear"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

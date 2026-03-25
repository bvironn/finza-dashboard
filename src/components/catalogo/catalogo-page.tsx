import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { api } from "@/lib/api"

type CatalogoType = "categorias" | "subcategorias" | "entidades"

const apiMap = {
  categorias: { get: api.getCategorias, create: api.createCategoria, update: api.updateCategoria, delete: api.deleteCategoria },
  subcategorias: { get: api.getSubcategorias, create: api.createSubcategoria, update: api.updateSubcategoria, delete: api.deleteSubcategoria },
  entidades: { get: api.getEntidades, create: api.createEntidad, update: api.updateEntidad, delete: api.deleteEntidad },
}

export function CatalogoPage() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold">Catálogo</h2>
      <Tabs defaultValue="categorias">
        <TabsList>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="subcategorias">Subcategorías</TabsTrigger>
          <TabsTrigger value="entidades">Entidades</TabsTrigger>
        </TabsList>
        <TabsContent value="categorias"><CatalogoSection type="categorias" title="Categorías" /></TabsContent>
        <TabsContent value="subcategorias"><CatalogoSection type="subcategorias" title="Subcategorías" /></TabsContent>
        <TabsContent value="entidades"><CatalogoSection type="entidades" title="Entidades" /></TabsContent>
      </Tabs>
    </div>
  )
}

function CatalogoSection({ type, title }: { type: CatalogoType; title: string }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [deleteInfo, setDeleteInfo] = useState<{ id: number; nombre: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: items, isError, error } = useQuery({ queryKey: [type], queryFn: apiMap[type].get })

  const filtered = useMemo(() => {
    if (!items) return []
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter((item) => item.nombre.toLowerCase().includes(q))
  }, [items, search])

  const updateMutation = useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) => apiMap[type].update(id, nombre),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type] })
      queryClient.invalidateQueries({ queryKey: ["transacciones"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      toast.success("Renombrado")
      setEditingId(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiMap[type].delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type] })
      toast.success("Eliminado")
      setDeleteInfo(null)
      setDeleteError(null)
    },
    onError: (err: Error) => setDeleteError(err.message),
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="mr-1 size-4" />Agregar
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isError && <p className="text-sm text-destructive">Error: {(error as Error).message}</p>}
        <div className="relative max-w-sm">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar..." className="pl-9" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">{search ? "Sin resultados" : "No hay registros"}</TableCell></TableRow>
            )}
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-muted-foreground">{item.id}</TableCell>
                <TableCell>
                  {editingId === item.id ? (
                    <div className="flex gap-2">
                      <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="h-8 max-w-xs" autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") updateMutation.mutate({ id: item.id, nombre: editingName })
                          if (e.key === "Escape") setEditingId(null)
                        }} />
                      <Button type="button" size="icon" variant="ghost" onClick={() => updateMutation.mutate({ id: item.id, nombre: editingName })}><CheckIcon /></Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => setEditingId(null)}><XIcon /></Button>
                    </div>
                  ) : <span className="font-medium">{item.nombre}</span>}
                </TableCell>
                <TableCell>
                  {editingId !== item.id && (
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => { setEditingId(item.id); setEditingName(item.nombre) }}><PencilIcon /></Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => { setDeleteInfo(item); setDeleteError(null) }}><TrashIcon /></Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <CreateDialog open={createOpen} onOpenChange={setCreateOpen} type={type} title={title} />

        <AlertDialog open={deleteInfo !== null} onOpenChange={() => setDeleteInfo(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar &quot;{deleteInfo?.nombre}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>{deleteError ? deleteError : "Se eliminará permanentemente. Si hay transacciones asociadas no se podrá eliminar."}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              {!deleteError && <AlertDialogAction onClick={() => deleteInfo && deleteMutation.mutate(deleteInfo.id)}>Eliminar</AlertDialogAction>}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

function CreateDialog({ open, onOpenChange, type, title }: { open: boolean; onOpenChange: (v: boolean) => void; type: CatalogoType; title: string }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState("")

  const mutation = useMutation({
    mutationFn: (nombre: string) => apiMap[type].create(nombre),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [type] })
      toast.success("Creado correctamente")
      setName("")
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Agregar a {title.toLowerCase()}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); const trimmed = name.trim(); if (trimmed) mutation.mutate(trimmed) }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cat-name">Nombre</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre..." autoFocus required />
          </div>
          <Button type="submit" disabled={mutation.isPending || !name.trim()}>{mutation.isPending ? "Creando..." : "Crear"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

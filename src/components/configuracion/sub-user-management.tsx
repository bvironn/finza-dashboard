import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PlusIcon, TrashIcon, PencilIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { api } from "@/lib/api"
import type { Usuario, SubUserPermisos } from "@/types"

const PERMISOS_LABELS: Record<keyof SubUserPermisos, string> = {
  ver_dashboard: "Ver dashboard", ver_transacciones: "Ver transacciones",
  crear_transacciones: "Crear transacciones", editar_transacciones: "Editar transacciones",
  eliminar_transacciones: "Eliminar transacciones", ver_catalogo: "Ver catálogo",
  editar_catalogo: "Editar catálogo", ver_gastos_fijos: "Ver gastos fijos",
  editar_gastos_fijos: "Editar gastos fijos", ver_ingresos_fijos: "Ver ingresos fijos",
  editar_ingresos_fijos: "Editar ingresos fijos", ver_configuracion: "Ver configuración",
}

const DEFAULT_PERMISOS: SubUserPermisos = {
  ver_dashboard: true, ver_transacciones: true, crear_transacciones: false,
  editar_transacciones: false, eliminar_transacciones: false, ver_catalogo: true,
  editar_catalogo: false, ver_gastos_fijos: true, editar_gastos_fijos: false,
  ver_ingresos_fijos: true, editar_ingresos_fijos: false, ver_configuracion: false,
}

export function SubUserManagement() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<Usuario | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data: subUsers } = useQuery({ queryKey: ["sub-users"], queryFn: api.getSubUsers })
  const { data: limit } = useQuery({ queryKey: ["sub-users", "limit"], queryFn: api.getSubUserLimit })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteSubUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sub-users"] }); toast.success("Sub-usuario eliminado"); setDeleteId(null) },
    onError: (err: Error) => toast.error(err.message),
  })

  const canCreate = limit ? limit.current < limit.max : true

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Sub-usuarios</CardTitle><CardDescription>{limit ? `${limit.current} de ${limit.max} disponibles` : "Cargando..."}</CardDescription></div>
        <Button onClick={() => setCreateOpen(true)} disabled={!canCreate}><PlusIcon className="mr-1 size-4" />Nuevo sub-usuario</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Estado</TableHead><TableHead className="w-[100px]">Acciones</TableHead></TableRow></TableHeader>
          <TableBody>
            {subUsers?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No tienes sub-usuarios</TableCell></TableRow>}
            {subUsers?.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell><Badge variant={u.activo ? "default" : "outline"}>{u.activo ? "Activo" : "Inactivo"}</Badge></TableCell>
                <TableCell><div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditUser(u)}><PencilIcon /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(u.id)}><TrashIcon /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CreateSubUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editUser && <EditSubUserDialog user={editUser} onClose={() => setEditUser(null)} />}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar sub-usuario?</AlertDialogTitle><AlertDialogDescription>Se eliminará permanentemente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function PermisosForm({ permisos, onChange }: { permisos: SubUserPermisos; onChange: (p: SubUserPermisos) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <Label>Permisos</Label>
      <div className="grid grid-cols-1 gap-2 rounded-md border p-3">
        {(Object.keys(PERMISOS_LABELS) as (keyof SubUserPermisos)[]).map((key) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm">{PERMISOS_LABELS[key]}</span>
            <Switch checked={permisos[key]} onCheckedChange={(v: boolean) => onChange({ ...permisos, [key]: v })} />
          </div>
        ))}
      </div>
    </div>
  )
}

function CreateSubUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nombre, setNombre] = useState("")
  const [permisos, setPermisos] = useState<SubUserPermisos>({ ...DEFAULT_PERMISOS })

  const mutation = useMutation({
    mutationFn: () => api.createSubUser({ email, password, nombre, permisos }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub-users"] }); toast.success("Sub-usuario creado"); onOpenChange(false)
      setEmail(""); setPassword(""); setNombre(""); setPermisos({ ...DEFAULT_PERMISOS })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nuevo sub-usuario</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2"><Label>Nombre</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="flex flex-col gap-2"><Label>Contraseña</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
          </div>
          <PermisosForm permisos={permisos} onChange={setPermisos} />
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Creando..." : "Crear sub-usuario"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditSubUserDialog({ user, onClose }: { user: Usuario; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState(user.nombre)
  const [email, setEmail] = useState(user.email)
  const [password, setPassword] = useState("")
  const [activo, setActivo] = useState(user.activo)
  const [permisos, setPermisos] = useState<SubUserPermisos>(user.permisos ?? { ...DEFAULT_PERMISOS })

  const mutation = useMutation({
    mutationFn: () => {
      const data: Record<string, any> = { nombre, email, activo, permisos }
      if (password) data.password = password
      return api.updateSubUser(user.id, data)
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sub-users"] }); toast.success("Sub-usuario actualizado"); onClose() },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar sub-usuario</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2"><Label>Nombre</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="flex flex-col gap-2"><Label>Nueva contraseña (vacío = sin cambios)</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} /></div>
          </div>
          <div className="flex items-center gap-3"><Switch checked={activo} onCheckedChange={setActivo} /><Label>Activo</Label></div>
          <PermisosForm permisos={permisos} onChange={setPermisos} />
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Guardando..." : "Guardar cambios"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

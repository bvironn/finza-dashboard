import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PlusIcon, TrashIcon, PencilIcon, ShieldIcon, UserIcon, UsersIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectGroup, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import type { Usuario, Rol, SubUserPermisos } from "@/lib/types"

const ROL_LABELS: Record<Rol, string> = {
  ADMIN: "Administrador",
  USER: "Usuario",
  SUB_USER: "Sub-usuario",
}

const ROL_ICONS: Record<Rol, typeof ShieldIcon> = {
  ADMIN: ShieldIcon,
  USER: UserIcon,
  SUB_USER: UsersIcon,
}

const PERMISOS_LABELS: Record<keyof SubUserPermisos, string> = {
  ver_dashboard: "Ver dashboard",
  ver_transacciones: "Ver transacciones",
  crear_transacciones: "Crear transacciones",
  editar_transacciones: "Editar transacciones",
  eliminar_transacciones: "Eliminar transacciones",
  ver_catalogo: "Ver catálogo",
  editar_catalogo: "Editar catálogo",
  ver_gastos_fijos: "Ver gastos fijos",
  editar_gastos_fijos: "Editar gastos fijos",
  ver_ingresos_fijos: "Ver ingresos fijos",
  editar_ingresos_fijos: "Editar ingresos fijos",
  ver_configuracion: "Ver configuración",
}

export function UserManagement() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<Usuario | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data: users } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: api.getUsers,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast.success("Usuario eliminado")
      setDeleteId(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>Gestionar usuarios y permisos del sistema</CardDescription>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Nuevo usuario
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Sub-users</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((u) => {
              const RolIcon = ROL_ICONS[u.rol]
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      <RolIcon className="size-3" />
                      {ROL_LABELS[u.rol]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.activo ? "default" : "outline"}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {u.rol !== "SUB_USER" ? u.max_sub_users : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          const full = await api.getUser(u.id)
                          setEditUser(full)
                        }}
                      >
                        <PencilIcon />
                      </Button>
                      {u.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(u.id)}
                        >
                          <TrashIcon />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} users={users ?? []} />
      <EditUserDialog user={editUser} onClose={() => setEditUser(null)} users={users ?? []} />

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos sus datos (transacciones, catálogo, etc.). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function CreateUserDialog({
  open,
  onOpenChange,
  users,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  users: Usuario[]
}) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nombre, setNombre] = useState("")
  const [rol, setRol] = useState<Rol>("USER")
  const [parentId, setParentId] = useState("")
  const [permisos, setPermisos] = useState<SubUserPermisos>({
    ver_dashboard: true,
    ver_transacciones: true,
    crear_transacciones: false,
    editar_transacciones: false,
    eliminar_transacciones: false,
    ver_catalogo: true,
    editar_catalogo: false,
    ver_gastos_fijos: true,
    editar_gastos_fijos: false,
    ver_ingresos_fijos: true,
    editar_ingresos_fijos: false,
    ver_configuracion: false,
  })

  const mutation = useMutation({
    mutationFn: () =>
      api.createUser({
        email,
        password,
        nombre,
        rol,
        parent_id: rol === "SUB_USER" ? Number(parentId) : undefined,
        permisos: rol === "SUB_USER" ? permisos : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast.success("Usuario creado")
      onOpenChange(false)
      setEmail(""); setPassword(""); setNombre(""); setRol("USER")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const parentUsers = users.filter((u) => u.rol === "ADMIN" || u.rol === "USER")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Rol</Label>
              <Select value={rol} onValueChange={(v) => setRol(v as Rol)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="USER">Usuario</SelectItem>
                    <SelectItem value="SUB_USER">Sub-usuario</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Contraseña</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
          </div>
          {rol === "SUB_USER" && (
            <>
              <div className="flex flex-col gap-2">
                <Label>Usuario padre (ve los datos de este usuario)</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {parentUsers.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.nombre} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label>Permisos</Label>
                <div className="grid grid-cols-1 gap-2 rounded-md border p-3">
                  {(Object.keys(PERMISOS_LABELS) as (keyof SubUserPermisos)[]).map((key) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm">{PERMISOS_LABELS[key]}</span>
                      <Switch
                        checked={permisos[key]}
                        onCheckedChange={(v: boolean) => setPermisos((p) => ({ ...p, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creando..." : "Crear usuario"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({
  user,
  onClose,
  users,
}: {
  user: Usuario | null
  onClose: () => void
  users: Usuario[]
}) {
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rol, setRol] = useState<Rol>("USER")
  const [activo, setActivo] = useState(true)
  const [maxSubUsers, setMaxSubUsers] = useState("3")
  const [parentId, setParentId] = useState("")
  const [permisos, setPermisos] = useState<SubUserPermisos>({
    ver_dashboard: true,
    ver_transacciones: true,
    crear_transacciones: false,
    editar_transacciones: false,
    eliminar_transacciones: false,
    ver_catalogo: true,
    editar_catalogo: false,
    ver_gastos_fijos: true,
    editar_gastos_fijos: false,
    ver_ingresos_fijos: true,
    editar_ingresos_fijos: false,
    ver_configuracion: false,
  })

  // Populate form when user changes
  const open = !!user
  if (user && nombre === "" && email === "") {
    setNombre(user.nombre)
    setEmail(user.email)
    setRol(user.rol)
    setActivo(user.activo)
    setMaxSubUsers(String(user.max_sub_users ?? 3))
    setParentId(user.parent_id ? String(user.parent_id) : "")
    if (user.permisos) setPermisos(user.permisos)
  }

  const handleClose = () => {
    setNombre(""); setEmail(""); setPassword(""); setRol("USER")
    onClose()
  }

  const mutation = useMutation({
    mutationFn: () => {
      const data: Record<string, any> = { nombre, email, rol, activo, max_sub_users: Number(maxSubUsers) }
      if (password) data.password = password
      if (rol === "SUB_USER") {
        data.parent_id = parentId ? Number(parentId) : null
        data.permisos = permisos
      }
      return api.updateUser(user!.id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast.success("Usuario actualizado")
      handleClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const parentUsers = users.filter((u) => (u.rol === "ADMIN" || u.rol === "USER") && u.id !== user?.id)

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Rol</Label>
              <Select value={rol} onValueChange={(v) => setRol(v as Rol)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="USER">Usuario</SelectItem>
                    <SelectItem value="SUB_USER">Sub-usuario</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Nueva contraseña (dejar vacío para no cambiar)</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Switch checked={activo} onCheckedChange={setActivo} />
              <Label>Usuario activo</Label>
            </div>
            {rol !== "SUB_USER" && (
              <div className="flex flex-col gap-2">
                <Label>Máx. sub-usuarios</Label>
                <Input
                  type="number"
                  min={0}
                  value={maxSubUsers}
                  onChange={(e) => setMaxSubUsers(e.target.value)}
                />
              </div>
            )}
          </div>
          {rol === "SUB_USER" && (
            <>
              <div className="flex flex-col gap-2">
                <Label>Usuario padre</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {parentUsers.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.nombre} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label>Permisos</Label>
                <div className="grid grid-cols-1 gap-2 rounded-md border p-3">
                  {(Object.keys(PERMISOS_LABELS) as (keyof SubUserPermisos)[]).map((key) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm">{PERMISOS_LABELS[key]}</span>
                      <Switch
                        checked={permisos[key]}
                        onCheckedChange={(v: boolean) => setPermisos((p) => ({ ...p, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

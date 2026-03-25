import {
  LayoutDashboardIcon,
  ArrowLeftRightIcon,
  TagIcon,
  CalendarClockIcon,
  TrendingUpIcon,
  SettingsIcon,
  WalletIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LogOutIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  CodeXmlIcon,
  HeartIcon,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePeriodo } from "@/lib/periodo-context"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { MESES_CORTO } from "@/config/constants"

declare const __APP_VERSION__: string

const navMain = [
  { title: "Dashboard", icon: LayoutDashboardIcon, path: "/" },
  { title: "Transacciones", icon: ArrowLeftRightIcon, path: "/transacciones" },
]

const navFijos = [
  { title: "Ingresos Fijos", icon: TrendingUpIcon, path: "/ingresos-fijos" },
  { title: "Gastos Fijos", icon: CalendarClockIcon, path: "/gastos-fijos" },
]

const navGestion = [
  { title: "Catálogo", icon: TagIcon, path: "/catalogo" },
  { title: "Configuración", icon: SettingsIcon, path: "/configuracion" },
]

interface AppSidebarProps {
  currentPath: string
}

export function AppSidebar({ currentPath }: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar()
  const collapsed = state === "collapsed"
  const { anio, mes, setAnio, setMes } = usePeriodo()
  const { user, logout } = useAuth()
  const [accountOpen, setAccountOpen] = useState(false)

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="/">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <WalletIcon className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">Finza</span>
                    <span className="text-xs text-muted-foreground">
                      Dashboard
                    </span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={collapsed ? "Expandir" : "Colapsar"}
                onClick={toggleSidebar}
              >
                {collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
                <span>Colapsar</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>General</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navMain.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={currentPath === item.path}
                      asChild
                    >
                      <a href={item.path}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Recurrentes</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navFijos.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={currentPath === item.path}
                      asChild
                    >
                      <a href={item.path}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Gestión</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navGestion.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={currentPath === item.path}
                      asChild
                    >
                      <a href={item.path}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          {collapsed ? (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={`${mes ? MESES_CORTO[mes - 1] + " " : ""}${anio}`}
                >
                  <CalendarIcon />
                  <span>{anio}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Cerrar sesión" onClick={logout}>
                  <LogOutIcon />
                  <span>Salir</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          ) : (
            <div className="flex flex-col gap-2 px-2 pb-2">
              <div className="flex items-center rounded-md border">
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 rounded-l-md p-2 text-left cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setAccountOpen(true)}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium truncate">
                      {user?.nombre}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {user?.rol}
                    </span>
                  </div>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 mr-1 size-7"
                  onClick={logout}
                >
                  <LogOutIcon className="size-3.5" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setAnio(anio - 1)}
                >
                  <ChevronLeftIcon className="size-3.5" />
                </Button>
                <span className="text-sm font-medium">{anio}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setAnio(anio + 1)}
                >
                  <ChevronRightIcon className="size-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={mes === null ? "default" : "ghost"}
                  onClick={() => setMes(null)}
                  className="col-span-4 h-7 text-xs"
                >
                  Todo el año
                </Button>
                {MESES_CORTO.map((nombre, i) => (
                  <Button
                    key={i}
                    type="button"
                    size="sm"
                    variant={mes === i + 1 ? "default" : "ghost"}
                    onClick={() => setMes(i + 1)}
                    className="h-7 text-xs"
                  >
                    {nombre}
                  </Button>
                ))}
              </div>
              <div className="flex items-center justify-center gap-1 pt-1 text-[10px] text-muted-foreground">
                <CodeXmlIcon className="size-3" />
                <span>Made with</span>
                <HeartIcon className="size-3 text-rose-600 transition-colors hover:text-rose-400" />
                <span>by</span>
                <a
                  href="https://github.com/bvironn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground/70 hover:text-foreground transition-colors"
                >
                  @bvironn
                </a>
                <span className="text-muted-foreground/50">
                  · v{__APP_VERSION__}
                </span>
              </div>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
    </>
  )
}

function AccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { user, login } = useAuth()
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [tab, setTab] = useState<"info" | "password">("info")

  const populated = nombre !== "" || email !== ""
  if (open && !populated && user) {
    setNombre(user.nombre)
    setEmail(user.email)
  }

  const handleClose = () => {
    setNombre("")
    setEmail("")
    setCurrentPassword("")
    setNewPassword("")
    setTab("info")
    onOpenChange(false)
  }

  const updateMutation = useMutation({
    mutationFn: () => api.updateMe({ nombre, email }),
    onSuccess: () => {
      if (user)
        login(localStorage.getItem("finza_token")!, {
          ...user,
          nombre,
          email,
        })
      toast.success("Cuenta actualizada")
      handleClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const passwordMutation = useMutation({
    mutationFn: () => api.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success("Contraseña actualizada")
      handleClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mi cuenta</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 border-b pb-3">
          <Button
            type="button"
            size="sm"
            variant={tab === "info" ? "default" : "ghost"}
            onClick={() => setTab("info")}
          >
            Datos
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "password" ? "default" : "ghost"}
            onClick={() => setTab("password")}
          >
            Contraseña
          </Button>
        </div>
        {tab === "info" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              updateMutation.mutate()
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="acc-nombre">Nombre</Label>
              <Input
                id="acc-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="acc-email">Email</Label>
              <Input
                id="acc-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              passwordMutation.mutate()
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="acc-cur-pass">Contraseña actual</Label>
              <Input
                id="acc-cur-pass"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="acc-new-pass">Nueva contraseña</Label>
              <Input
                id="acc-new-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending
                ? "Cambiando..."
                : "Cambiar contraseña"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

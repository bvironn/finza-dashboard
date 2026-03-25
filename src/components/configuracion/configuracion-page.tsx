import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DownloadIcon, UploadIcon, Trash2Icon, SunIcon, MoonIcon, MonitorIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectGroup, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { api } from "@/lib/api"
import { useTheme } from "@/components/common/theme-provider"
import { useAuth } from "@/lib/auth-context"
import { SubUserManagement } from "@/components/configuracion/sub-user-management"
import { UserManagement } from "@/components/configuracion/user-management"
import { MONEDAS } from "@/config/constants"

export function ConfiguracionPage() {
  const queryClient = useQueryClient()
  const { theme, setTheme } = useTheme()
  const { isAdmin, user } = useAuth()
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: api.getConfig })
  const [anio, setAnio] = useState("")
  const [iva, setIva] = useState("")
  const [moneda, setMoneda] = useState("")
  const [resetConfirm, setResetConfirm] = useState(false)

  const currentAnio = anio || String(config?.anio ?? "")
  const currentIva = iva || String(config?.iva ?? "")
  const currentMoneda = moneda || (config?.moneda ?? "€")

  const updateMutation = useMutation({
    mutationFn: () => api.updateConfig({ anio: Number(currentAnio), iva: Number(currentIva), moneda: currentMoneda }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["transacciones"] })
      toast.success("Configuración actualizada")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleExport = async () => {
    try {
      const data = await api.exportar()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `finza-${currentAnio}-export.json`; a.click()
      URL.revokeObjectURL(url)
      toast.success("Datos exportados")
    } catch { toast.error("Error al exportar") }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await api.importar(data)
      queryClient.invalidateQueries()
      toast.success("Datos importados correctamente")
    } catch { toast.error("Error al importar") }
    e.target.value = ""
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold">Configuración</h2>

      <Card>
        <CardHeader><CardTitle>General</CardTitle><CardDescription>Año fiscal, IVA y moneda</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate() }} className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2"><Label>Año fiscal</Label><Input type="number" value={currentAnio} onChange={(e) => setAnio(e.target.value)} /></div>
              <div className="flex flex-col gap-2"><Label>IVA (%)</Label><Input type="number" step="0.01" value={currentIva} onChange={(e) => setIva(e.target.value)} /></div>
              <div className="flex flex-col gap-2">
                <Label>Moneda</Label>
                <Select value={currentMoneda} onValueChange={setMoneda}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    {MONEDAS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectGroup></SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={updateMutation.isPending} className="self-start">
              {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Apariencia</CardTitle><CardDescription>Tema de la interfaz</CardDescription></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}><SunIcon className="mr-1 size-4" />Claro</Button>
            <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}><MoonIcon className="mr-1 size-4" />Oscuro</Button>
            <Button variant={theme === "system" ? "default" : "outline"} onClick={() => setTheme("system")}><MonitorIcon className="mr-1 size-4" />Sistema</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Datos</CardTitle><CardDescription>Exportar, importar o resetear todos los datos</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleExport}><DownloadIcon className="mr-1 size-4" />Exportar JSON</Button>
            <Button variant="outline" asChild>
              <label className="cursor-pointer"><UploadIcon className="mr-1 size-4" />Importar JSON<input type="file" accept=".json" className="hidden" onChange={handleImport} /></label>
            </Button>
          </div>
          <Separator />
          <div>
            <Button variant="destructive" onClick={() => setResetConfirm(true)}><Trash2Icon className="mr-1 size-4" />Resetear todos los datos</Button>
            <p className="mt-2 text-xs text-muted-foreground">Elimina todas las transacciones, gastos fijos, ingresos fijos y catálogo.</p>
          </div>
        </CardContent>
      </Card>

      {user?.rol !== "SUB_USER" && <SubUserManagement />}
      {isAdmin && <UserManagement />}

      <AlertDialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Resetear todos los datos?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará TODAS las transacciones, gastos fijos, ingresos fijos, categorías, subcategorías y entidades. Solo se mantendrá la configuración. NO se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              try {
                await api.importar({ categorias: [], subcategorias: [], entidades: [], transacciones: [], gastos_fijos: [], ingresos_fijos: [],
                  configuracion: [{ anio: config?.anio ?? 2025, iva: config?.iva ?? 21, moneda: config?.moneda ?? "€" }] })
                queryClient.invalidateQueries()
                toast.success("Datos reseteados")
              } catch { toast.error("Error al resetear") }
            }}>Sí, resetear todo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

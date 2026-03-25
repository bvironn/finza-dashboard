import { Routes, Route, Navigate } from "react-router-dom"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { DashboardPage } from "@/pages/dashboard"
import { TransaccionesPage } from "@/pages/transacciones"
import { CatalogoPage } from "@/pages/catalogo"
import { GastosFijosPage } from "@/pages/gastos-fijos"
import { IngresosFijosPage } from "@/pages/ingresos-fijos"
import { ConfiguracionPage } from "@/pages/configuracion"
import { LoginPage } from "@/pages/login"
import { useAuth } from "@/lib/auth-context"

function ProtectedLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/transacciones" element={<TransaccionesPage />} />
              <Route path="/catalogo" element={<CatalogoPage />} />
              <Route path="/gastos-fijos" element={<GastosFijosPage />} />
              <Route path="/ingresos-fijos" element={<IngresosFijosPage />} />
              <Route path="/configuracion" element={<ConfiguracionPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

export function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/*"
        element={user ? <ProtectedLayout /> : <Navigate to="/login" replace />}
      />
    </Routes>
  )
}

export default App

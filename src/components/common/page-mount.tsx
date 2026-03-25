import { useState, useEffect, lazy, Suspense, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/common/theme-provider"
import { AuthProvider, useAuth, getStoredToken } from "@/lib/auth-context"
import { PeriodoProvider } from "@/lib/periodo-context"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/common/app-sidebar"
import { AppHeader } from "@/components/common/app-header"

const DashboardPage = lazy(() => import("@/components/dashboard/dashboard-page").then(m => ({ default: m.DashboardPage })))
const TransaccionesPage = lazy(() => import("@/components/transacciones/transacciones-page").then(m => ({ default: m.TransaccionesPage })))
const CatalogoPage = lazy(() => import("@/components/catalogo/catalogo-page").then(m => ({ default: m.CatalogoPage })))
const GastosFijosPage = lazy(() => import("@/components/gastos-fijos/gastos-fijos-page").then(m => ({ default: m.GastosFijosPage })))
const IngresosFijosPage = lazy(() => import("@/components/ingresos-fijos/ingresos-fijos-page").then(m => ({ default: m.IngresosFijosPage })))
const ConfiguracionPage = lazy(() => import("@/components/configuracion/configuracion-page").then(m => ({ default: m.ConfiguracionPage })))

const PAGES: Record<string, React.LazyExoticComponent<() => React.JSX.Element>> = {
  "/": DashboardPage,
  "/transacciones": TransaccionesPage,
  "/catalogo": CatalogoPage,
  "/gastos-fijos": GastosFijosPage,
  "/ingresos-fijos": IngresosFijosPage,
  "/configuracion": ConfiguracionPage,
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 2, refetchOnWindowFocus: false } },
})

function Loading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Cargando...</div>
    </div>
  )
}

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <PeriodoProvider>
              {children}
            </PeriodoProvider>
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

function AuthGate({ children }: { children: ReactNode }) {
  const { login, logout } = useAuth()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      window.location.href = "/login"
      return
    }

    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("invalid")
        return res.json()
      })
      .then((user) => {
        login(token, user)
        setReady(true)
      })
      .catch(() => {
        logout()
      })
  }, [])

  if (!ready) return <Loading />
  return <>{children}</>
}

function Shell({ currentPath, children }: { currentPath: string; children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full">
        <AppSidebar currentPath={currentPath} />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}

export function ProtectedPage({ page: initialPage }: { page: string }) {
  const [currentPage, setCurrentPage] = useState(initialPage)

  useEffect(() => {
    const handleNavigation = () => setCurrentPage(window.location.pathname)
    document.addEventListener("astro:page-load", handleNavigation)
    return () => document.removeEventListener("astro:page-load", handleNavigation)
  }, [])

  const PageComponent = PAGES[currentPage]

  return (
    <Providers>
      <AuthGate>
        <Shell currentPath={currentPage}>
          <Suspense fallback={<Loading />}>
            {PageComponent ? <PageComponent /> : <div>Pagina no encontrada</div>}
          </Suspense>
        </Shell>
      </AuthGate>
    </Providers>
  )
}

export function LoginMount() {
  const LoginPage = lazy(() => import("@/components/auth/login-page").then(m => ({ default: m.LoginPage })))
  return (
    <Providers>
      <Suspense fallback={<Loading />}>
        <LoginPage />
      </Suspense>
    </Providers>
  )
}

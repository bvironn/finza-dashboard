import { useEffect, useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/common/app-sidebar"
import { AppHeader } from "@/components/common/app-header"
import { AppProviders } from "@/components/common/app-providers"

interface AppShellProps {
  children?: React.ReactNode
  currentPath: string
}

function forceLogout() {
  localStorage.removeItem("finza_token")
  localStorage.removeItem("finza_user")
  window.location.href = "/login"
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("finza_token")
    if (!token) {
      forceLogout()
      return
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("invalid")
        return res.json()
      })
      .then((user) => {
        localStorage.setItem("finza_user", JSON.stringify(user))
        setChecked(true)
      })
      .catch(() => {
        forceLogout()
      })
  }, [])

  if (!checked) return null
  return <>{children}</>
}

function ShellContent({ children, currentPath }: AppShellProps) {
  return (
    <AuthGate>
      <SidebarProvider>
        <div className="flex min-h-svh w-full">
          <AppSidebar currentPath={currentPath} />
          <div className="flex flex-1 flex-col">
            <AppHeader />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </AuthGate>
  )
}

export function AppShell({ children, currentPath }: AppShellProps) {
  return (
    <AppProviders>
      <ShellContent currentPath={currentPath}>{children}</ShellContent>
    </AppProviders>
  )
}

import { createContext, useContext, useState } from "react"
import type { AuthUser } from "@/types"

const TOKEN_KEY = "finza_token"
const USER_KEY = "finza_user"

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  isAdmin: boolean
  hasPermission: (key: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(TOKEN_KEY)
  })
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null
    const stored = localStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) : null
  })

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
    window.location.href = "/login"
  }

  const isAdmin = user?.rol === "ADMIN"

  const hasPermission = (key: string): boolean => {
    if (!user) return false
    if (user.rol === "ADMIN" || user.rol === "USER") return true
    if (!user.permisos) return false
    return !!(user.permisos as unknown as Record<string, boolean>)[key]
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

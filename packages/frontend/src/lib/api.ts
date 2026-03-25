import type {
  Categoria,
  Subcategoria,
  Entidad,
  Transaccion,
  TransaccionInput,
  GastoFijo,
  IngresoFijo,
  Configuracion,
  ResumenMes,
  DesgloseDimension,
  PaginatedResponse,
  LoginResponse,
  AuthUser,
  Usuario,
  SubUserPermisos,
  SubUserLimitInfo,
} from "./types"
import { getStoredToken } from "./auth-context"

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  const res = await fetch(url, { ...init, headers })
  if (res.status === 401) {
    // Token expired or invalid — clear and redirect
    localStorage.removeItem("finza_token")
    localStorage.removeItem("finza_user")
    if (window.location.pathname !== "/login") {
      window.location.href = "/login"
    }
    throw new Error("Sesión expirada")
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// --- Catálogo ---
export const api = {
  // Categorías
  getCategorias: () => fetchJSON<Categoria[]>("/api/categorias"),
  createCategoria: (nombre: string) =>
    fetchJSON<Categoria>("/api/categorias", { method: "POST", body: JSON.stringify({ nombre }) }),
  updateCategoria: (id: number, nombre: string) =>
    fetchJSON<Categoria>(`/api/categorias/${id}`, { method: "PUT", body: JSON.stringify({ nombre }) }),
  deleteCategoria: (id: number) =>
    fetchJSON<{ ok: boolean }>(`/api/categorias/${id}`, { method: "DELETE" }),
  getCategoriaCount: (id: number) =>
    fetchJSON<{ count: number }>(`/api/categorias/${id}/count`),

  // Subcategorías
  getSubcategorias: () => fetchJSON<Subcategoria[]>("/api/subcategorias"),
  createSubcategoria: (nombre: string) =>
    fetchJSON<Subcategoria>("/api/subcategorias", { method: "POST", body: JSON.stringify({ nombre }) }),
  updateSubcategoria: (id: number, nombre: string) =>
    fetchJSON<Subcategoria>(`/api/subcategorias/${id}`, { method: "PUT", body: JSON.stringify({ nombre }) }),
  deleteSubcategoria: (id: number) =>
    fetchJSON<{ ok: boolean }>(`/api/subcategorias/${id}`, { method: "DELETE" }),

  // Entidades
  getEntidades: () => fetchJSON<Entidad[]>("/api/entidades"),
  createEntidad: (nombre: string) =>
    fetchJSON<Entidad>("/api/entidades", { method: "POST", body: JSON.stringify({ nombre }) }),
  updateEntidad: (id: number, nombre: string) =>
    fetchJSON<Entidad>(`/api/entidades/${id}`, { method: "PUT", body: JSON.stringify({ nombre }) }),
  deleteEntidad: (id: number) =>
    fetchJSON<{ ok: boolean }>(`/api/entidades/${id}`, { method: "DELETE" }),

  // Transacciones
  getTransacciones: (params: Record<string, string | number>) => {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== "" && v !== undefined && v !== null) qs.set(k, String(v))
    }
    return fetchJSON<PaginatedResponse<Transaccion>>(`/api/transacciones?${qs}`)
  },
  getTransaccion: (id: number) => fetchJSON<Transaccion>(`/api/transacciones/${id}`),
  createTransaccion: (data: TransaccionInput) =>
    fetchJSON<{ id: number }>("/api/transacciones", { method: "POST", body: JSON.stringify(data) }),
  updateTransaccion: (id: number, data: Partial<TransaccionInput>) =>
    fetchJSON<any>(`/api/transacciones/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTransaccion: (id: number) =>
    fetchJSON<{ ok: boolean }>(`/api/transacciones/${id}`, { method: "DELETE" }),
  bulkCreateTransacciones: (data: TransaccionInput[]) =>
    fetchJSON<{ inserted: number }>("/api/transacciones/bulk", { method: "POST", body: JSON.stringify(data) }),

  // Dashboard
  getTotales: (anio: number, mes?: number | null) =>
    fetchJSON<{ ingresos: number; gastos: number; balance: number }>(
      `/api/dashboard/totales?anio=${anio}${mes ? `&mes=${mes}` : ""}`
    ),
  getResumenMensual: (anio: number) =>
    fetchJSON<ResumenMes[]>(`/api/dashboard/resumen-mensual?anio=${anio}`),
  getDesglose: (dimension: string, anio: number, mes?: number | null) =>
    fetchJSON<DesgloseDimension[]>(
      `/api/dashboard/desglose/${dimension}?anio=${anio}${mes ? `&mes=${mes}` : ""}`
    ),

  // Gastos fijos
  getGastosFijos: () => fetchJSON<GastoFijo[]>("/api/gastos-fijos"),
  createGastoFijo: (data: Omit<GastoFijo, "id" | "entidad">) =>
    fetchJSON<{ id: number }>("/api/gastos-fijos", { method: "POST", body: JSON.stringify(data) }),
  updateGastoFijo: (id: number, data: Partial<Omit<GastoFijo, "id" | "entidad">>) =>
    fetchJSON<any>(`/api/gastos-fijos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteGastoFijo: (id: number) =>
    fetchJSON<{ ok: boolean }>(`/api/gastos-fijos/${id}`, { method: "DELETE" }),
  // Ingresos fijos
  getIngresosFijos: () => fetchJSON<IngresoFijo[]>("/api/ingresos-fijos"),
  createIngresoFijo: (data: Omit<IngresoFijo, "id" | "entidad">) =>
    fetchJSON<{ id: number }>("/api/ingresos-fijos", { method: "POST", body: JSON.stringify(data) }),
  updateIngresoFijo: (id: number, data: Partial<Omit<IngresoFijo, "id" | "entidad">>) =>
    fetchJSON<any>(`/api/ingresos-fijos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteIngresoFijo: (id: number) =>
    fetchJSON<{ ok: boolean }>(`/api/ingresos-fijos/${id}`, { method: "DELETE" }),
  // Configuración
  getConfig: () => fetchJSON<Configuracion>("/api/config"),
  updateConfig: (data: Partial<Configuracion>) =>
    fetchJSON<{ ok: boolean }>("/api/config", { method: "PUT", body: JSON.stringify(data) }),
  exportar: () => fetchJSON<any>("/api/config/exportar", { method: "POST" }),
  importar: (data: any) =>
    fetchJSON<{ ok: boolean }>("/api/config/importar", { method: "POST", body: JSON.stringify(data) }),

  // Auth
  login: (email: string, password: string) =>
    fetchJSON<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => fetchJSON<AuthUser>("/api/auth/me"),
  updateMe: (data: { nombre?: string; email?: string }) =>
    fetchJSON<{ ok: boolean }>("/api/auth/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  changePassword: (current_password: string, new_password: string) =>
    fetchJSON<{ ok: boolean }>("/api/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ current_password, new_password }),
    }),

  // Sub-users (USER + ADMIN)
  getSubUsers: () => fetchJSON<Usuario[]>("/api/sub-users"),
  getSubUserLimit: () => fetchJSON<SubUserLimitInfo>("/api/sub-users/limit"),
  createSubUser: (data: {
    email: string
    password: string
    nombre: string
    permisos?: Partial<SubUserPermisos>
  }) =>
    fetchJSON<{ id: number }>("/api/sub-users", { method: "POST", body: JSON.stringify(data) }),
  updateSubUser: (id: number, data: Record<string, any>) =>
    fetchJSON<{ ok: boolean }>(`/api/sub-users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSubUser: (id: number) =>
    fetchJSON<{ ok: boolean }>(`/api/sub-users/${id}`, { method: "DELETE" }),

  // Admin: Users
  getUsers: () => fetchJSON<Usuario[]>("/api/admin/users"),
  getUser: (id: number) => fetchJSON<Usuario>(`/api/admin/users/${id}`),
  createUser: (data: {
    email: string
    password: string
    nombre: string
    rol: string
    parent_id?: number
    permisos?: Partial<SubUserPermisos>
  }) =>
    fetchJSON<{ id: number }>("/api/admin/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: number, data: Record<string, any>) =>
    fetchJSON<{ ok: boolean }>(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteUser: (id: number) =>
    fetchJSON<{ ok: boolean }>(`/api/admin/users/${id}`, { method: "DELETE" }),
}

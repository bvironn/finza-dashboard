import { createContext, useContext, useState } from "react"

interface PeriodoContextType {
  anio: number
  mes: number | null
  setAnio: (anio: number) => void
  setMes: (mes: number | null) => void
}

const PeriodoContext = createContext<PeriodoContextType | undefined>(undefined)

const now = new Date()

export function PeriodoProvider({ children }: { children: React.ReactNode }) {
  const [anio, setAnio] = useState(now.getFullYear())
  const [mes, setMes] = useState<number | null>(null)

  return (
    <PeriodoContext.Provider value={{ anio, mes, setAnio, setMes }}>
      {children}
    </PeriodoContext.Provider>
  )
}

export function usePeriodo() {
  const ctx = useContext(PeriodoContext)
  if (!ctx) throw new Error("usePeriodo must be used within PeriodoProvider")
  return ctx
}

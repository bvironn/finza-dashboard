import { Separator } from "@/components/ui/separator"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { usePeriodo } from "@/lib/periodo-context"
import { MESES } from "@/config/constants"

export function AppHeader() {
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: api.getConfig,
  })
  const { anio, mes } = usePeriodo()

  return (
    <header className="flex h-14 items-center gap-3 border-b px-4">
      <span className="text-sm font-medium">
        {mes ? `${MESES[mes - 1]} ${anio}` : `Año ${anio}`}
      </span>
      <Separator orientation="vertical" className="h-6" />
      <span className="text-sm text-muted-foreground">
        {config?.moneda ?? "€"}
      </span>
    </header>
  )
}

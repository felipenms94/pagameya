import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  HandCoins,
  Flame,
} from "lucide-react"
import type { AlertKind } from "@/lib/types"

const kindConfig: Record<
  AlertKind,
  { label: string; icon: React.ElementType; variant: "destructive" | "default" | "secondary" | "outline" }
> = {
  OVERDUE: { label: "Vencida", icon: AlertTriangle, variant: "destructive" },
  DUE_TODAY: { label: "Vence hoy", icon: CalendarClock, variant: "default" },
  DUE_SOON: { label: "Vence pronto", icon: CalendarDays, variant: "secondary" },
  PROMISE_TODAY: { label: "Promesa hoy", icon: HandCoins, variant: "outline" },
  HIGH_PRIORITY: { label: "Prioridad alta", icon: Flame, variant: "secondary" },
}

export function AlertKindBadge({ kind }: { kind: AlertKind }) {
  const config = kindConfig[kind]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

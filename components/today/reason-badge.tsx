"use client"

import { Badge } from "@/components/ui/badge"
import type { TodayReason } from "@/lib/types"

const reasonConfig: Record<TodayReason, { label: string; className: string }> = {
  OVERDUE: {
    label: "Vencido",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  DUE_TODAY: {
    label: "Vence hoy",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  PROMISE_TODAY: {
    label: "Promesa hoy",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
}

export function ReasonBadge({ reason }: { reason: TodayReason }) {
  const config = reasonConfig[reason]
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

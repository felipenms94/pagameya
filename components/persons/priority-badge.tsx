"use client"

import { Badge } from "@/components/ui/badge"
import type { Priority } from "@/lib/types"

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  LOW: {
    label: "Baja",
    className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  },
  MEDIUM: {
    label: "Media",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  HIGH: {
    label: "Alta",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const config = priorityConfig[priority]
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertKindBadge } from "./alert-kind-badge"
import type { AlertItem } from "@/lib/types"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
  })
}

type AlertsListProps = {
  items: AlertItem[]
  limit?: number
}

export function AlertsList({ items, limit }: AlertsListProps) {
  const visible = limit ? items.slice(0, limit) : items

  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Sin alertas activas.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {visible.map((item) => (
        <div
          key={item.debtId}
          className="flex flex-col gap-2 rounded-lg border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{item.personName}</p>
              <AlertKindBadge kind={item.kind} />
            </div>
            <p className="text-xs text-muted-foreground">
              {item.debtTitle} &middot;{" "}
              <span className="font-medium">{formatCurrency(item.balance)}</span>
              {item.dueDate && (
                <> &middot; Vence {formatDate(item.dueDate)}</>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/app/deudas/${item.debtId}`}>Ver deuda</Link>
          </Button>
        </div>
      ))}
    </div>
  )
}

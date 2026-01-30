"use client"

import { cn } from "@/lib/utils"

type DebtProgressProps = {
  amountOriginal: number
  balance: number
  currency?: string
  size?: "sm" | "default" | "lg"
  className?: string
}

function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function calculateProgress(amountOriginal: number, balance: number) {
  const paid = amountOriginal - balance
  const paidPct = amountOriginal > 0 ? (paid / amountOriginal) * 100 : 0
  return {
    paid: Math.max(0, paid),
    paidPct: Math.min(Math.max(paidPct, 0), 100),
  }
}

export function DebtProgress({
  amountOriginal,
  balance,
  currency = "USD",
  size = "default",
  className,
}: DebtProgressProps) {
  const { paid, paidPct } = calculateProgress(amountOriginal, balance)

  const barHeight = {
    sm: "h-1.5",
    default: "h-2",
    lg: "h-3",
  }

  const barColor =
    paidPct >= 100
      ? "bg-green-500"
      : paidPct >= 50
      ? "bg-blue-500"
      : paidPct > 0
      ? "bg-amber-500"
      : "bg-muted"

  return (
    <div className={cn("space-y-1", className)}>
      <div className={cn("relative w-full overflow-hidden rounded-full bg-muted", barHeight[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${paidPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{paidPct.toFixed(0)}% pagado</span>
        <span>{formatCurrency(paid, currency)} de {formatCurrency(amountOriginal, currency)}</span>
      </div>
    </div>
  )
}

// Compact version for tables
export function DebtProgressCompact({
  amountOriginal,
  balance,
  className,
}: Omit<DebtProgressProps, "size" | "currency">) {
  const { paidPct } = calculateProgress(amountOriginal, balance)

  const barColor =
    paidPct >= 100
      ? "bg-green-500"
      : paidPct >= 50
      ? "bg-blue-500"
      : paidPct > 0
      ? "bg-amber-500"
      : "bg-muted"

  return (
    <div className={cn("flex items-center gap-2 min-w-[100px]", className)}>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${paidPct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
        {paidPct.toFixed(0)}%
      </span>
    </div>
  )
}

// Large card version for detail pages
export function DebtProgressCard({
  amountOriginal,
  balance,
  currency = "USD",
  className,
}: DebtProgressProps) {
  const { paid, paidPct } = calculateProgress(amountOriginal, balance)

  const barColor =
    paidPct >= 100
      ? "bg-green-500"
      : paidPct >= 50
      ? "bg-blue-500"
      : paidPct > 0
      ? "bg-amber-500"
      : "bg-muted"

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${paidPct}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-foreground drop-shadow-sm">
            {paidPct.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-lg font-semibold text-green-600">
            {formatCurrency(paid, currency)}
          </p>
          <p className="text-xs text-muted-foreground">Pagado</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-amber-600">
            {formatCurrency(balance, currency)}
          </p>
          <p className="text-xs text-muted-foreground">Pendiente</p>
        </div>
        <div>
          <p className="text-lg font-semibold">
            {formatCurrency(amountOriginal, currency)}
          </p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>
    </div>
  )
}

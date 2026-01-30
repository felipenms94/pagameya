"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import type { TodayReason } from "@/lib/types"
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  CalendarClock,
  HandCoins,
} from "lucide-react"

// Local types for the alerts card component
type AlertItemLocal = {
  debtId: string
  personName: string
  title: string | null
  balance: number
  currency: string
  reason: TodayReason
}

type AlertsDataLocal = {
  counts?: {
    overdue?: number
    dueToday?: number
    promiseToday?: number
  }
  items: AlertItemLocal[]
}

const STORAGE_KEY = "pagameya_dismissed_alerts"
const MAX_ITEMS_VISIBLE = 5

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

// Configuration by alert reason
const alertConfig: Record<
  TodayReason,
  {
    label: string
    icon: React.ElementType
    borderColor: string
    bgColor: string
    textColor: string
    badgeBg: string
    badgeText: string
  }
> = {
  OVERDUE: {
    label: "Vencida",
    icon: AlertTriangle,
    borderColor: "border-red-200",
    bgColor: "bg-red-50/70",
    textColor: "text-red-900",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
  },
  DUE_TODAY: {
    label: "Vence hoy",
    icon: CalendarClock,
    borderColor: "border-amber-200",
    bgColor: "bg-amber-50/70",
    textColor: "text-amber-900",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
  },
  PROMISE_TODAY: {
    label: "Promesa hoy",
    icon: HandCoins,
    borderColor: "border-blue-200",
    bgColor: "bg-blue-50/70",
    textColor: "text-blue-900",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
  },
}

function ReasonBadge({ reason }: { reason: TodayReason }) {
  const config = alertConfig[reason]
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.badgeBg} ${config.badgeText}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

function AlertItemCard({ item }: { item: AlertItemLocal }) {
  const config = alertConfig[item.reason]

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border ${config.borderColor} bg-white/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between`}
    >
      <div className="space-y-1">
        <p className={`text-sm font-semibold ${config.textColor}`}>
          {item.personName}
        </p>
        <p className="text-xs text-gray-600">
          {item.title ?? "Deuda sin título"} ·{" "}
          <span className="font-medium">
            {formatCurrency(item.balance, item.currency)}
          </span>
        </p>
        <ReasonBadge reason={item.reason} />
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/app/deudas/${item.debtId}`}>Ver deuda</Link>
      </Button>
    </div>
  )
}

// Get dismissed signature from sessionStorage
function getDismissedSignature(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(STORAGE_KEY)
}

// Save dismissed signature to sessionStorage
function setDismissedSignature(signature: string) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(STORAGE_KEY, signature)
}

type AlertsNoticeProps = {
  data?: AlertsDataLocal
  isLoading?: boolean
}

export function AlertsNotice({ data, isLoading }: AlertsNoticeProps) {
  const [dismissedSignatureOverride, setDismissedSignatureOverride] = useState<
    string | null
  >(null)
  const [showDetails, setShowDetails] = useState(false)

  const counts = data?.counts
  const total =
    (counts?.overdue ?? 0) +
    (counts?.dueToday ?? 0) +
    (counts?.promiseToday ?? 0)

  // Create a unique signature for current alerts
  const signature = useMemo(() => {
    if (!data) return ""
    return JSON.stringify({
      counts: data.counts,
      ids: data.items.map((item) => item.debtId).sort(),
    })
  }, [data])

  const storedSignature = getDismissedSignature()
  const effectiveSignature = dismissedSignatureOverride ?? storedSignature
  const dismissed = signature !== "" && effectiveSignature === signature

  const handleDismiss = () => {
    if (signature) {
      setDismissedSignature(signature)
      setDismissedSignatureOverride(signature)
    }
  }

  // Sort items by priority: OVERDUE first, then DUE_TODAY, then PROMISE_TODAY
  const sortedItems = useMemo(() => {
    if (!data?.items) return []
    const priority: Record<TodayReason, number> = {
      OVERDUE: 0,
      DUE_TODAY: 1,
      PROMISE_TODAY: 2,
    }
    return [...data.items].sort((a, b) => priority[a.reason] - priority[b.reason])
  }, [data])

  const visibleItems = sortedItems.slice(0, MAX_ITEMS_VISIBLE)
  const hasMoreItems = sortedItems.length > MAX_ITEMS_VISIBLE

  // Determine main color based on most urgent alert
  const mainColor = useMemo(() => {
    if ((counts?.overdue ?? 0) > 0) return "red"
    if ((counts?.dueToday ?? 0) > 0) return "amber"
    return "blue"
  }, [counts])

  const colorStyles = {
    red: {
      border: "border-red-200",
      bg: "bg-red-50/70",
      iconBg: "bg-red-100",
      iconText: "text-red-700",
      title: "text-red-900",
      text: "text-red-900/80",
      button: "text-red-900 hover:bg-red-100",
    },
    amber: {
      border: "border-amber-200",
      bg: "bg-amber-50/70",
      iconBg: "bg-amber-100",
      iconText: "text-amber-700",
      title: "text-amber-900",
      text: "text-amber-900/80",
      button: "text-amber-900 hover:bg-amber-100",
    },
    blue: {
      border: "border-blue-200",
      bg: "bg-blue-50/70",
      iconBg: "bg-blue-100",
      iconText: "text-blue-700",
      title: "text-blue-900",
      text: "text-blue-900/80",
      button: "text-blue-900 hover:bg-blue-100",
    },
  }

  const styles = colorStyles[mainColor]

  // Don't render until hydrated to avoid mismatch
  if (typeof window === "undefined") return null
  if (isLoading || !data || total === 0 || dismissed) return null

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} px-4 py-3`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-full ${styles.iconBg} p-2 ${styles.iconText}`}>
            {mainColor === "red" ? (
              <AlertTriangle className="h-4 w-4" />
            ) : mainColor === "amber" ? (
              <CalendarClock className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
          </div>
          <div className="space-y-1">
            <p className={`text-sm font-semibold ${styles.title}`}>
              {mainColor === "red"
                ? "Atención: Deudas vencidas"
                : mainColor === "amber"
                ? "Cobros del día"
                : "Promesas de pago"}
            </p>
            <div className={`flex flex-wrap gap-4 text-sm ${styles.text}`}>
              {(counts?.overdue ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                  Vencidas: {counts?.overdue}
                </span>
              )}
              {(counts?.dueToday ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                  Vence hoy: {counts?.dueToday}
                </span>
              )}
              {(counts?.promiseToday ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                  Promesas: {counts?.promiseToday}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={styles.button}
            onClick={() => setShowDetails((prev) => !prev)}
          >
            {showDetails ? "Ocultar" : "Ver detalles"}
            {showDetails ? (
              <ChevronUp className="ml-1 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-1 h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={styles.button}
            onClick={handleDismiss}
            title="Ocultar alertas"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 space-y-2">
          {visibleItems.map((item) => (
            <AlertItemCard key={item.debtId} item={item} />
          ))}

          {hasMoreItems && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                +{sortedItems.length - MAX_ITEMS_VISIBLE} alertas más
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/app/cobrar-hoy">Ver todas en Cobrar Hoy</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

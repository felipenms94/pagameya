"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertKindBadge } from "@/components/alerts/alert-kind-badge"
import { useWhatsappLink } from "@/hooks"
import { useToast } from "@/components/ui/toast"
import {
  MessageCircle,
  Phone,
  Loader2,
  BellRing,
} from "lucide-react"
import type { InternalReminderItem, WhatsappTone } from "@/lib/types"

const TONE_TO_WHATSAPP: Record<string, WhatsappTone> = {
  soft: "soft",
  normal: "normal",
  strong: "fuerte",
}

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

function ReminderRow({ item }: { item: InternalReminderItem }) {
  const whatsapp = useWhatsappLink()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  const displayDate =
    item.kind === "PROMISE_TODAY" && item.promisedDate
      ? item.promisedDate
      : item.dueDate

  const handleWhatsapp = async () => {
    setBusy(true)
    try {
      await whatsapp.mutateAsync({
        personId: item.personId,
        debtId: item.debtId,
        tone: TONE_TO_WHATSAPP[item.recommendedTone] ?? "soft",
      })
    } catch {
      toast("Error al abrir WhatsApp", "error")
    } finally {
      setBusy(false)
    }
  }

  const handleCall = () => {
    if (item.personPhone) {
      navigator.clipboard.writeText(item.personPhone)
      toast("Teléfono copiado al portapapeles", "info")
    } else {
      toast("Esta persona no tiene teléfono registrado", "info")
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/personas/${item.personId}`}
            className="text-sm font-semibold hover:underline truncate"
          >
            {item.personName}
          </Link>
          <AlertKindBadge kind={item.kind} />
        </div>
        <p className="text-xs text-muted-foreground">
          <Link
            href={`/app/deudas/${item.debtId}`}
            className="hover:underline"
          >
            {item.debtTitle}
          </Link>
          {" "}&middot;{" "}
          <span className="font-medium">{formatCurrency(item.balance)}</span>
          {displayDate && <> &middot; {formatDate(displayDate)}</>}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {item.suggestedAction === "WHATSAPP" && item.personPhone ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={busy}
            onClick={handleWhatsapp}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={handleCall}
          >
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">
              {item.personPhone ? "Llamar" : "Sin tel."}
            </span>
          </Button>
        )}
      </div>
    </div>
  )
}

type InternalRemindersListProps = {
  items: InternalReminderItem[]
  limit?: number
}

export function InternalRemindersList({
  items,
  limit,
}: InternalRemindersListProps) {
  const visible = limit ? items.slice(0, limit) : items

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <BellRing className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No hay recordatorios internos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {visible.map((item) => (
        <ReminderRow key={`${item.kind}:${item.debtId}`} item={item} />
      ))}
    </div>
  )
}

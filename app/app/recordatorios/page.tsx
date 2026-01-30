"use client"

import { useMemo, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertKindBadge } from "@/components/alerts/alert-kind-badge"
import {
  useSuggestedReminders,
  useWhatsappLink,
  useLogReminder,
} from "@/hooks"
import { useToast } from "@/components/ui/toast"
import {
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  MessageCircle,
  Mail,
  Smartphone,
  Loader2,
  BellRing,
} from "lucide-react"
import type {
  DebtDirection,
  SuggestedReminderItem,
  WhatsappTone,
} from "@/lib/types"

const TONE_MAP: Record<string, WhatsappTone> = {
  soft: "soft",
  normal: "normal",
  strong: "fuerte",
}

const TONE_LABELS: { value: string; label: string }[] = [
  { value: "soft", label: "Suave" },
  { value: "normal", label: "Normal" },
  { value: "strong", label: "Fuerte" },
]

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

function filterBySearch(
  items: SuggestedReminderItem[],
  search: string
): SuggestedReminderItem[] {
  if (!search.trim()) return items
  const s = search.toLowerCase()
  return items.filter(
    (item) =>
      item.personName.toLowerCase().includes(s) ||
      item.debtTitle.toLowerCase().includes(s)
  )
}

function ReminderRow({ item }: { item: SuggestedReminderItem }) {
  const whatsapp = useWhatsappLink()
  const logReminder = useLogReminder()
  const { toast } = useToast()
  const [busyChannel, setBusyChannel] = useState<string | null>(null)

  const displayDate =
    item.kind === "PROMISE_TODAY" && item.promisedDate
      ? item.promisedDate
      : item.dueDate

  const handleWhatsapp = async (tone: string) => {
    setBusyChannel("WHATSAPP")
    try {
      await whatsapp.mutateAsync({
        personId: item.personId,
        debtId: item.debtId,
        tone: TONE_MAP[tone] ?? "soft",
      })
      await logReminder.mutateAsync({
        debtId: item.debtId,
        personId: item.personId,
        channel: "WHATSAPP",
        tone: tone as "soft" | "normal" | "strong",
        kind: item.kind,
      })
      toast("WhatsApp abierto y registrado", "success")
    } catch {
      toast("Error al enviar WhatsApp", "error")
    } finally {
      setBusyChannel(null)
    }
  }

  const handleEmailSms = async (channel: "EMAIL" | "SMS") => {
    setBusyChannel(channel)
    try {
      await logReminder.mutateAsync({
        debtId: item.debtId,
        personId: item.personId,
        channel,
        kind: item.kind,
      })
      toast("Recordatorio registrado", "success")
    } catch {
      toast("Error al registrar", "error")
    } finally {
      setBusyChannel(null)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold truncate">{item.personName}</p>
          <AlertKindBadge kind={item.kind} />
          {item.recommendedTone === "fuerte" && (
            <Badge variant="destructive" className="text-[10px]">
              Tono fuerte
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {item.debtTitle} &middot;{" "}
          <span className="font-medium">{formatCurrency(item.balance)}</span>
          {displayDate && <> &middot; {formatDate(displayDate)}</>}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* WhatsApp dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!item.channels.whatsapp || busyChannel !== null}
              className="gap-1"
            >
              {busyChannel === "WHATSAPP" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {TONE_LABELS.map((t) => (
              <DropdownMenuItem
                key={t.value}
                onClick={() => handleWhatsapp(t.value)}
              >
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Email */}
        <Button
          variant="outline"
          size="sm"
          disabled={!item.channels.email || busyChannel !== null}
          onClick={() => handleEmailSms("EMAIL")}
          className="gap-1"
        >
          {busyChannel === "EMAIL" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Email</span>
        </Button>

        {/* SMS */}
        <Button
          variant="outline"
          size="sm"
          disabled={!item.channels.sms || busyChannel !== null}
          onClick={() => handleEmailSms("SMS")}
          className="gap-1"
        >
          {busyChannel === "SMS" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Smartphone className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">SMS</span>
        </Button>
      </div>
    </div>
  )
}

function ReminderTabContent({
  direction,
  search,
}: {
  direction: DebtDirection
  search: string
}) {
  const { data, isLoading } = useSuggestedReminders(direction)

  const filtered = useMemo(
    () => filterBySearch(data?.items ?? [], search).slice(0, 50),
    [data?.items, search]
  )

  const totalCount = data?.items?.length ?? 0

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {filtered.length} recordatorio{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
          {totalCount > filtered.length && (
            <CardDescription>
              {totalCount - filtered.length} ocultos por filtro
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <BellRing className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No hay recordatorios sugeridos.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <ReminderRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function RecordatoriosPage() {
  const [activeTab, setActiveTab] = useState<DebtDirection>("RECEIVABLE")
  const [search, setSearch] = useState("")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Recordatorios</h2>
          <p className="text-muted-foreground">
            Recordatorios sugeridos basados en alertas activas.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por persona o deuda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as DebtDirection)}
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="RECEIVABLE" className="gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Por Cobrar
          </TabsTrigger>
          <TabsTrigger value="PAYABLE" className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Por Pagar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="RECEIVABLE">
          <ReminderTabContent direction="RECEIVABLE" search={search} />
        </TabsContent>
        <TabsContent value="PAYABLE">
          <ReminderTabContent direction="PAYABLE" search={search} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

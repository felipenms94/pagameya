"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadError } from "@/components/ui/load-error"
import { TodayTable } from "@/components/today"
import { AlertsList } from "@/components/alerts/alerts-list"
import { InternalRemindersList } from "@/components/reminders/internal-reminders-list"
import { useToday, useAlerts, useInternalReminders } from "@/hooks"
import { Search, ArrowDownLeft, ArrowUpRight, Bell, BellRing } from "lucide-react"
import type { DebtDirection, TodayItem } from "@/lib/types"

// Filter out OVERDUE items - they belong in alerts, not "Cobrar Hoy"
function filterTodayOnly(items: TodayItem[]): TodayItem[] {
  return items.filter(
    (item) => item.reason === "DUE_TODAY" || item.reason === "PROMISE_TODAY"
  )
}

function filterBySearch(items: TodayItem[], search: string): TodayItem[] {
  if (!search.trim()) return items

  const searchLower = search.toLowerCase()
  return items.filter((item) => {
    const name = item.debt.person.name.toLowerCase()
    const phone = item.debt.person.phone?.toLowerCase() ?? ""
    const title = (item.debt.title ?? "").toLowerCase()
    return (
      name.includes(searchLower) ||
      phone.includes(searchLower) ||
      title.includes(searchLower)
    )
  })
}

function TodayTabContent({
  direction,
  search,
}: {
  direction: DebtDirection
  search: string
}) {
  const { data: items, isLoading, error, refetch } = useToday(direction)
  const { data: alerts, error: alertsError, refetch: refetchAlerts } = useAlerts(direction)
  const { data: internalReminders } = useInternalReminders(direction)

  const filteredItems = useMemo(() => {
    const todayOnly = filterTodayOnly(items ?? [])
    return filterBySearch(todayOnly, search)
  }, [items, search])

  const alertItems = alerts?.items ?? []
  const reminderItems = internalReminders?.items ?? []

  const criticalError = error || alertsError
  if (criticalError && !isLoading) {
    return (
      <LoadError
        error={criticalError}
        onRetry={() => {
          if (error) refetch()
          if (alertsError) refetchAlerts()
        }}
        title="Error al cargar datos"
      />
    )
  }

  return (
    <div className="space-y-4">
      {alertItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base">
                Alertas ({alertItems.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <AlertsList items={alertItems} limit={20} />
          </CardContent>
        </Card>
      )}
      {reminderItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">
                Recordatorios internos ({reminderItems.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <InternalRemindersList items={reminderItems} limit={20} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="pt-6">
          <TodayTable
            items={filteredItems}
            isLoading={isLoading}
            showWhatsappDropdown
            variant={direction === "RECEIVABLE" ? "receivable" : "payable"}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default function CobrarHoyPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")

  const normalizedTabParam =
    tabParam === "PAYABLE" || tabParam === "RECEIVABLE" ? tabParam : null
  const [activeTab, setActiveTab] = useState<DebtDirection>(
    normalizedTabParam ?? "RECEIVABLE"
  )
  const [search, setSearch] = useState("")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cobrar Hoy</h2>
          <p className="text-muted-foreground">
            Gestiona tus cobros y pagos pendientes del día.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DebtDirection)}>
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
          <TodayTabContent direction="RECEIVABLE" search={search} />
        </TabsContent>

        <TabsContent value="PAYABLE">
          <TodayTabContent direction="PAYABLE" search={search} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

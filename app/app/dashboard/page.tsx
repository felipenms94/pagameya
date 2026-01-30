"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { TodayTable } from "@/components/today"
import { AlertsList } from "@/components/alerts/alerts-list"
import { InternalRemindersList } from "@/components/reminders/internal-reminders-list"
import { useAlerts, useDashboard, useToday, useInternalReminders } from "@/hooks"
import type { AlertsSummary } from "@/lib/types"
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  CalendarCheck,
  ArrowRight,
  Bell,
  BellRing,
} from "lucide-react"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  isLoading,
  variant = "default",
}: {
  title: string
  value: number
  subtitle: string
  icon: React.ElementType
  isLoading?: boolean
  variant?: "default" | "warning" | "success"
}) {
  const variantStyles = {
    default: "text-muted-foreground",
    warning: "text-amber-500",
    success: "text-green-500",
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${variantStyles[variant]}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{formatCurrency(value)}</div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryChips({ summary, label }: { summary: AlertsSummary; label: string }) {
  const total =
    summary.overdueCount + summary.dueTodayCount + summary.dueSoonCount +
    summary.highPriorityCount + summary.promiseTodayCount
  if (total === 0) return null

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      {label}:
      {summary.overdueCount > 0 && (
        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
          {summary.overdueCount} vencidas
        </Badge>
      )}
      {summary.dueTodayCount > 0 && (
        <Badge variant="default" className="h-5 px-1.5 text-[10px]">
          {summary.dueTodayCount} hoy
        </Badge>
      )}
      {summary.dueSoonCount > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {summary.dueSoonCount} pronto
        </Badge>
      )}
      {summary.promiseTodayCount > 0 && (
        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
          {summary.promiseTodayCount} promesas
        </Badge>
      )}
    </span>
  )
}

export default function DashboardPage() {
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard()
  const { data: todayReceivable, isLoading: receivableLoading } = useToday("RECEIVABLE")
  const { data: todayPayable, isLoading: payableLoading } = useToday("PAYABLE")
  const { data: alerts } = useAlerts()
  const { data: internalReminders } = useInternalReminders()

  // Filter out OVERDUE - only show DUE_TODAY and PROMISE_TODAY
  const cobrarHoyItems = useMemo(() => {
    return (todayReceivable ?? []).filter(
      (item) => item.reason === "DUE_TODAY" || item.reason === "PROMISE_TODAY"
    )
  }, [todayReceivable])

  const pagarHoyItems = useMemo(() => {
    return (todayPayable ?? []).filter(
      (item) => item.reason === "DUE_TODAY" || item.reason === "PROMISE_TODAY"
    )
  }, [todayPayable])

  const receivable = dashboard?.totals.receivable
  const payable = dashboard?.totals.payable

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Resumen de tu actividad de cobros y deudas.
        </p>
      </div>

      {/* Alerts Summary */}
      {alerts && alerts.items.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base">Alertas</CardTitle>
              <SummaryChips summary={alerts.summary.receivable} label="Cobrar" />
              <SummaryChips summary={alerts.summary.payable} label="Pagar" />
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/app/cobrar-hoy">
                Ver todas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <AlertsList items={alerts.items} limit={5} />
          </CardContent>
        </Card>
      )}

      {/* Internal Reminders */}
      {internalReminders && internalReminders.items.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Recordatorios internos</CardTitle>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {internalReminders.items.length}
              </Badge>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/app/cobrar-hoy">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <InternalRemindersList items={internalReminders.items} limit={5} />
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Por Cobrar"
          value={receivable?.totalOpen ?? 0}
          subtitle="Total pendiente"
          icon={ArrowDownLeft}
          isLoading={dashboardLoading}
        />
        <StatCard
          title="Vencido"
          value={receivable?.overdue ?? 0}
          subtitle="Requiere atención"
          icon={AlertTriangle}
          isLoading={dashboardLoading}
          variant="warning"
        />
        <StatCard
          title="Cobrar Hoy"
          value={receivable?.dueToday ?? 0}
          subtitle="Vence hoy"
          icon={CalendarCheck}
          isLoading={dashboardLoading}
        />
        <StatCard
          title="Por Pagar"
          value={payable?.totalOpen ?? 0}
          subtitle="Deudas propias"
          icon={ArrowUpRight}
          isLoading={dashboardLoading}
        />
      </div>

      {/* Today's Collections Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Cobrar Hoy</CardTitle>
            <CardDescription>
              Cobros que vencen hoy o tienen promesa de pago
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/app/cobrar-hoy">
              Ver todo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <TodayTable
            items={cobrarHoyItems}
            isLoading={receivableLoading}
            limit={5}
            variant="receivable"
          />
        </CardContent>
      </Card>

      {/* Today's Payments Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pagar Hoy</CardTitle>
            <CardDescription>
              Deudas propias que vencen hoy
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/app/cobrar-hoy?tab=PAYABLE">
              Ver todo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <TodayTable
            items={pagarHoyItems}
            isLoading={payableLoading}
            limit={5}
            variant="payable"
          />
        </CardContent>
      </Card>
    </div>
  )
}

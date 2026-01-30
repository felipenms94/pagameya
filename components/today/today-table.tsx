"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/toast"
import { ReasonBadge } from "./reason-badge"
import { WhatsappButton } from "./whatsapp-button"
import { useCreatePayment } from "@/hooks"
import type { TodayItem } from "@/lib/types"
import { Zap, Loader2 } from "lucide-react"

type TodayTableProps = {
  items: TodayItem[]
  isLoading?: boolean
  showWhatsappDropdown?: boolean
  limit?: number
  variant?: "receivable" | "payable"
}

const emptyMessages = {
  receivable: {
    title: "No hay cobros pendientes",
    description: "Cuando haya deudas por cobrar hoy, aparecerán aquí.",
  },
  payable: {
    title: "No hay pagos pendientes",
    description: "Cuando haya deudas por pagar hoy, aparecerán aquí.",
  },
}

function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateString: string | null) {
  if (!dateString) return "Sin fecha"
  const date = new Date(dateString)
  return date.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Persona</TableHead>
          <TableHead>Deuda</TableHead>
          <TableHead className="text-right">Balance</TableHead>
          <TableHead>Vencimiento</TableHead>
          <TableHead>Motivo</TableHead>
          <TableHead className="text-right">Acción</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <div className="space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-16 ml-auto" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-8 w-20 ml-auto" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

type QuickPayTarget = {
  debtId: string
  amount: number
  currency: string
} | null

export function TodayTable({
  items,
  isLoading,
  showWhatsappDropdown = false,
  limit,
  variant = "receivable",
}: TodayTableProps) {
  const { toast } = useToast()
  const createPayment = useCreatePayment()
  const [quickPayTarget, setQuickPayTarget] = useState<QuickPayTarget>(null)

  const handleQuickPay = async () => {
    if (!quickPayTarget) return
    try {
      await createPayment.mutateAsync({
        debtId: quickPayTarget.debtId,
        amount: quickPayTarget.amount,
        paymentTypeId: null,
        note: "Pago rápido",
        paidAt: null,
      })
      toast(
        `Pago de ${formatCurrency(quickPayTarget.amount, quickPayTarget.currency)} registrado`,
        "success"
      )
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al registrar pago",
        "error"
      )
    } finally {
      setQuickPayTarget(null)
    }
  }

  if (isLoading) {
    return <TableSkeleton rows={limit || 5} />
  }

  const displayItems = limit ? items.slice(0, limit) : items
  const messages = emptyMessages[variant]

  if (displayItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          {messages.title}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {messages.description}
        </p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Persona</TableHead>
            <TableHead>Deuda</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayItems.map((item) => {
            const balance = Math.round(item.debt.balance * 100) / 100
            const suggestedPayments = (item.debt.suggestedPayments ?? [])
              .filter((amount) => amount > 0 && amount <= balance)
              .map((amount) => Math.round(amount * 100) / 100)
            const hasSuggestions = suggestedPayments.length > 0 && balance > 0

            return (
              <TableRow key={item.debt.id}>
                <TableCell>
                  <div>
                    <Link
                      href={`/app/personas/${item.debt.person.id}`}
                      className="font-medium hover:underline"
                    >
                      {item.debt.person.name}
                    </Link>
                    {item.debt.person.phone && (
                      <p className="text-xs text-muted-foreground">
                        {item.debt.person.phone}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/app/deudas/${item.debt.id}`}
                    className="hover:underline"
                  >
                    <p className="font-medium">
                      {item.debt.title || `Deuda #${item.debt.id.slice(0, 6)}`}
                    </p>
                  </Link>
                  {item.debt.description && (
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {item.debt.description}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.debt.balance, item.debt.currency)}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(item.debt.dueDate)}
                </TableCell>
                <TableCell>
                  <ReasonBadge reason={item.reason} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {hasSuggestions && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1"
                            disabled={createPayment.isPending}
                          >
                            <Zap className="h-3 w-3" />
                            <span className="hidden sm:inline">Pagar</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Pago rápido</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {suggestedPayments.map((amount) => (
                            <DropdownMenuItem
                              key={amount}
                              onClick={() =>
                                setQuickPayTarget({
                                  debtId: item.debt.id,
                                  amount,
                                  currency: item.debt.currency,
                                })
                              }
                            >
                              {formatCurrency(amount, item.debt.currency)}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              setQuickPayTarget({
                                debtId: item.debt.id,
                                amount: balance,
                                currency: item.debt.currency,
                              })
                            }
                          >
                            Pagar todo ({formatCurrency(balance, item.debt.currency)})
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <WhatsappButton
                      personId={item.debt.person.id}
                      debtId={item.debt.id}
                      hasPhone={!!item.debt.person.phone}
                      variant={showWhatsappDropdown ? "dropdown" : "simple"}
                    />
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Confirmación de Pago Rápido */}
      <AlertDialog
        open={!!quickPayTarget}
        onOpenChange={(open) => !open && setQuickPayTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar pago rápido</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Registrar un pago de{" "}
              <span className="font-semibold">
                {quickPayTarget
                  ? formatCurrency(quickPayTarget.amount, quickPayTarget.currency)
                  : ""}
              </span>
              {" "}para esta deuda?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleQuickPay}
              disabled={createPayment.isPending}
            >
              {createPayment.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar pago
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

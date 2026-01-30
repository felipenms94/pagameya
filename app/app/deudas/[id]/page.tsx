"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/toast"
import { WhatsappButton } from "@/components/today/whatsapp-button"
import {
  useDebt,
  usePaymentTypes,
  useCreatePayment,
  useDeletePayment,
  usePromises,
  useCreatePromise,
  useDeletePromise,
  useAttachments,
  useCreateAttachment,
  useDeleteAttachment,
} from "@/hooks"
import type { Payment } from "@/lib/types"
import { ArrowLeft, Plus, Trash2, Loader2, Link2, Zap, Calendar, DollarSign, TrendingUp, Percent, CheckCircle2 } from "lucide-react"

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Monto requerido"),
  paymentTypeId: z.string().optional(),
  note: z.string().optional(),
  paidAt: z.string().optional(),
})

type PaymentFormValues = z.infer<typeof paymentSchema>

const promiseSchema = z.object({
  promisedDate: z.string().min(1, "Fecha requerida"),
  note: z.string().optional(),
})

type PromiseFormValues = z.infer<typeof promiseSchema>

const attachmentSchema = z.object({
  url: z.string().min(1, "URL requerida"),
  note: z.string().optional(),
})

type AttachmentFormValues = z.infer<typeof attachmentSchema>

const statusLabels = {
  PENDING: "Pendiente",
  PAID: "Pagada",
  OVERDUE: "Vencida",
}

const statusVariant: Record<"PENDING" | "PAID" | "OVERDUE", "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  PAID: "outline",
  OVERDUE: "destructive",
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateString: string | null) {
  if (!dateString) return "Sin fecha"
  return new Date(dateString).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function toLocalDateIso(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toISOString()
}

export default function DebtDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const debtId = params.id as string

  const { data: debt, isLoading } = useDebt(debtId)
  const { data: paymentTypes } = usePaymentTypes()
  const { data: promises = [] } = usePromises(debtId)
  const { data: attachments = [] } = useAttachments(debtId)
  const createPayment = useCreatePayment()
  const deletePayment = useDeletePayment()
  const createPromise = useCreatePromise()
  const deletePromise = useDeletePromise()
  const createAttachment = useCreateAttachment()
  const deleteAttachment = useDeleteAttachment()

  const paymentTypeMap = useMemo(() => {
    return new Map(paymentTypes?.map((type) => [type.id, type.name]))
  }, [paymentTypes])

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [promiseDialogOpen, setPromiseDialogOpen] = useState(false)
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false)
  const [deletePaymentTarget, setDeletePaymentTarget] = useState<Payment | null>(
    null
  )
  const [deletePromiseTarget, setDeletePromiseTarget] = useState<string | null>(
    null
  )
  const [deleteAttachmentTarget, setDeleteAttachmentTarget] = useState<string | null>(
    null
  )
  const [quickPayAmount, setQuickPayAmount] = useState<number | null>(null)

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentTypeId: "",
      note: "",
      paidAt: "",
    },
  })

  const promiseForm = useForm<PromiseFormValues>({
    resolver: zodResolver(promiseSchema),
    defaultValues: {
      promisedDate: "",
      note: "",
    },
  })

  const attachmentForm = useForm<AttachmentFormValues>({
    resolver: zodResolver(attachmentSchema),
    defaultValues: {
      url: "",
      note: "",
    },
  })

  const handleCreatePayment = async (data: PaymentFormValues) => {
    if (!debt) return
    try {
      await createPayment.mutateAsync({
        debtId: debt.id,
        amount: data.amount,
        paymentTypeId: data.paymentTypeId || null,
        note: data.note || null,
        paidAt: data.paidAt ? toLocalDateIso(data.paidAt) : null,
      })
      toast("Pago registrado correctamente", "success")
      setPaymentDialogOpen(false)
      paymentForm.reset()
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al registrar pago",
        "error"
      )
    }
  }

  const handleDeletePayment = async () => {
    if (!deletePaymentTarget || !debt) return
    try {
      await deletePayment.mutateAsync({
        paymentId: deletePaymentTarget.id,
        debtId: debt.id,
      })
      toast("Pago eliminado", "success")
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al eliminar pago",
        "error"
      )
    } finally {
      setDeletePaymentTarget(null)
    }
  }

  const handleCreatePromise = async (data: PromiseFormValues) => {
    if (!debt) return
    try {
      await createPromise.mutateAsync({
        debtId: debt.id,
        promisedDate: toLocalDateIso(data.promisedDate),
        note: data.note || null,
      })
      toast("Promesa registrada", "success")
      setPromiseDialogOpen(false)
      promiseForm.reset()
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al crear promesa",
        "error"
      )
    }
  }

  const handleDeletePromise = async () => {
    if (!deletePromiseTarget || !debt) return
    try {
      await deletePromise.mutateAsync({
        promiseId: deletePromiseTarget,
        debtId: debt.id,
      })
      toast("Promesa eliminada", "success")
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al eliminar promesa",
        "error"
      )
    } finally {
      setDeletePromiseTarget(null)
    }
  }

  const handleCreateAttachment = async (data: AttachmentFormValues) => {
    if (!debt) return
    try {
      await createAttachment.mutateAsync({
        debtId: debt.id,
        url: data.url,
        note: data.note || null,
      })
      toast("Adjunto agregado", "success")
      setAttachmentDialogOpen(false)
      attachmentForm.reset()
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al agregar adjunto",
        "error"
      )
    }
  }

  const handleDeleteAttachment = async () => {
    if (!deleteAttachmentTarget || !debt) return
    try {
      await deleteAttachment.mutateAsync({
        id: deleteAttachmentTarget,
        debtId: debt.id,
      })
      toast("Adjunto eliminado", "success")
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al eliminar adjunto",
        "error"
      )
    } finally {
      setDeleteAttachmentTarget(null)
    }
  }

  const handleQuickPay = async () => {
    if (!quickPayAmount || !debt) return
    try {
      await createPayment.mutateAsync({
        debtId: debt.id,
        amount: quickPayAmount,
        paymentTypeId: null,
        note: "Pago rápido",
        paidAt: null,
      })
      toast(`Pago de ${formatCurrency(quickPayAmount, debt.currency)} registrado`, "success")
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al registrar pago",
        "error"
      )
    } finally {
      setQuickPayAmount(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-40 mt-2" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!debt) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Deuda no encontrada.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6" key={debtId}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {debt.title || `Deuda #${debt.id.slice(0, 6)}`}
            </h2>
            <p className="text-muted-foreground">{debt.person.name}</p>
          </div>
        </div>
        <WhatsappButton
          personId={debt.person.id}
          debtId={debt.id}
          hasPhone={!!debt.person.phone}
          variant="dropdown"
        />
      </div>

      {/* Resumen Financiero */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Resumen Financiero
          </CardTitle>
          <CardDescription>Estado actual de la deuda.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar PRO */}
          {(() => {
            const paid = Math.max(0, debt.totalDue - debt.balance)
            const paidPct = debt.totalDue > 0 ? Math.min(100, Math.round((paid / debt.totalDue) * 100)) : 0
            const isFullyPaid = debt.balance <= 0

            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progreso de pago</span>
                  <span className="font-medium">
                    {isFullyPaid ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Pagado 100%
                      </span>
                    ) : (
                      `Pagado ${paidPct}% (${formatCurrency(paid, debt.currency)} / ${formatCurrency(debt.totalDue, debt.currency)})`
                    )}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFullyPaid ? "bg-green-500" : "bg-primary"
                    }`}
                    style={{ width: `${paidPct}%` }}
                  />
                </div>
              </div>
            )
          })()}

          {/* Financial Summary Grid */}
          {(() => {
            const paid = Math.max(0, debt.totalDue - debt.balance)
            return (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Monto Original</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(debt.amountOriginal, debt.currency)}
                  </p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Pagado</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(paid, debt.currency)}
                  </p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Interés Acumulado
                  </p>
                  <p className="text-lg font-semibold text-orange-600">
                    {formatCurrency(debt.interestAccrued || 0, debt.currency)}
                  </p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Total a Pagar
                  </p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(debt.totalDue, debt.currency)}
                  </p>
                </div>
                <div className={`rounded-lg border p-3 space-y-1 ${debt.balance <= 0 ? "bg-green-50 border-green-200" : "bg-primary/5"}`}>
                  <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                  <p className={`text-lg font-bold ${debt.balance <= 0 ? "text-green-600" : "text-primary"}`}>
                    {formatCurrency(Math.max(0, debt.balance), debt.currency)}
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Status and Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusVariant[debt.status] as "default"}>
                {statusLabels[debt.status]}
              </Badge>
              {debt.hasInterest && (
                <Badge variant="secondary" className="gap-1">
                  <Percent className="h-3 w-3" />
                  Con interés {debt.interestRatePct ? `(${debt.interestRatePct}% ${debt.interestPeriod === "MONTHLY" ? "mensual" : ""})` : ""}
                </Badge>
              )}
              {debt.splitCount && debt.splitCount > 1 && (
                <Badge variant="secondary">
                  {debt.splitCount} cuotas
                </Badge>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dirección</span>
                <span>{debt.direction === "RECEIVABLE" ? "Por cobrar" : "Por pagar"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vence</span>
                <span>{formatDate(debt.dueDate)}</span>
              </div>
              {debt.description && (
                <div className="pt-2 text-muted-foreground">{debt.description}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abonos Rápidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Abonos Rápidos
          </CardTitle>
          <CardDescription>
            {debt.balance <= 0
              ? "Esta deuda ya fue saldada."
              : "Registra un pago con un solo click."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {debt.balance <= 0 ? (
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <CheckCircle2 className="h-5 w-5" />
              Deuda saldada
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(debt.suggestedPayments ?? [])
                .filter((amount) => amount > 0 && amount <= debt.balance)
                .map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => setQuickPayAmount(Math.round(amount * 100) / 100)}
                    disabled={createPayment.isPending}
                  >
                    {formatCurrency(amount, debt.currency)}
                  </Button>
                ))}
              {debt.minSuggestedPayment &&
               debt.minSuggestedPayment > 0 &&
               !(debt.suggestedPayments ?? []).includes(debt.minSuggestedPayment) &&
               debt.minSuggestedPayment <= debt.balance && (
                <Button
                  variant="outline"
                  onClick={() => setQuickPayAmount(Math.round(debt.minSuggestedPayment! * 100) / 100)}
                  disabled={createPayment.isPending}
                >
                  {formatCurrency(debt.minSuggestedPayment, debt.currency)} (mín.)
                </Button>
              )}
              {debt.balance > 0 && (
                <Button
                  variant="default"
                  onClick={() => setQuickPayAmount(Math.round(debt.balance * 100) / 100)}
                  disabled={createPayment.isPending}
                >
                  Pagar todo ({formatCurrency(debt.balance, debt.currency)})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan de Cuotas */}
      {debt.scheduleSuggested && debt.scheduleSuggested.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Plan de Cuotas Sugerido
            </CardTitle>
            <CardDescription>
              Calendario de pagos proyectado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuota #</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debt.scheduleSuggested.map((installment) => (
                  <TableRow key={installment.installmentNumber}>
                    <TableCell className="font-medium">
                      {installment.installmentNumber}
                    </TableCell>
                    <TableCell>{formatDate(installment.dueDate)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(installment.amount, debt.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Pagos</CardTitle>
              <CardDescription>Pagos registrados en esta deuda.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar pago
            </Button>
          </CardHeader>
          <CardContent>
            {debt.payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">No hay pagos registrados.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debt.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.paidAt)}</TableCell>
                      <TableCell>
                        {payment.paymentTypeId
                          ? paymentTypeMap.get(payment.paymentTypeId) ?? payment.paymentTypeId
                          : "-"}
                      </TableCell>
                      <TableCell>{payment.note || "-"}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(payment.amount, debt.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletePaymentTarget(payment)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Promesas</CardTitle>
              <CardDescription>Promesas de pago registradas.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setPromiseDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva promesa
            </Button>
          </CardHeader>
          <CardContent>
            {promises.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">No hay promesas registradas.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promises.map((promise) => (
                    <TableRow key={promise.id}>
                      <TableCell>{formatDate(promise.promisedDate)}</TableCell>
                      <TableCell>{promise.note || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletePromiseTarget(promise.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Adjuntos</CardTitle>
            <CardDescription>Links o evidencias asociadas.</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAttachmentDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar adjunto
          </Button>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No hay adjuntos.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Link</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attachments.map((attachment) => (
                  <TableRow key={attachment.id}>
                    <TableCell>
                      <a
                        href={attachment.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Link2 className="h-4 w-4" />
                        <span className="truncate max-w-[280px]">{attachment.fileUrl}</span>
                      </a>
                    </TableCell>
                    <TableCell>{attachment.note || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteAttachmentTarget(attachment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={paymentForm.handleSubmit(handleCreatePayment)}>
            <DialogHeader>
              <DialogTitle>Registrar pago</DialogTitle>
              <DialogDescription>Agrega un pago parcial o total.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Monto *</Label>
                <Input type="number" step="0.01" {...paymentForm.register("amount")} />
                {paymentForm.formState.errors.amount && (
                  <p className="text-sm text-destructive">
                    {paymentForm.formState.errors.amount.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Tipo de pago</Label>
                <Select
                  value={paymentForm.watch("paymentTypeId") || "none"}
                  onValueChange={(value) =>
                    paymentForm.setValue("paymentTypeId", value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin tipo</SelectItem>
                    {paymentTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Fecha de pago</Label>
                <Input type="date" {...paymentForm.register("paidAt")} />
              </div>
              <div className="grid gap-2">
                <Label>Nota</Label>
                <Input placeholder="Opcional" {...paymentForm.register("note")} />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createPayment.isPending}>
                {createPayment.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={promiseDialogOpen} onOpenChange={setPromiseDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={promiseForm.handleSubmit(handleCreatePromise)}>
            <DialogHeader>
              <DialogTitle>Nueva promesa</DialogTitle>
              <DialogDescription>Registra un compromiso de pago.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Fecha *</Label>
                <Input type="date" {...promiseForm.register("promisedDate")} />
                {promiseForm.formState.errors.promisedDate && (
                  <p className="text-sm text-destructive">
                    {promiseForm.formState.errors.promisedDate.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Nota</Label>
                <Input placeholder="Opcional" {...promiseForm.register("note")} />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPromiseDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createPromise.isPending}>
                {createPromise.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={attachmentDialogOpen} onOpenChange={setAttachmentDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={attachmentForm.handleSubmit(handleCreateAttachment)}>
            <DialogHeader>
              <DialogTitle>Agregar adjunto</DialogTitle>
              <DialogDescription>Guarda un link o referencia.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>URL *</Label>
                <Input placeholder="https://..." {...attachmentForm.register("url")} />
                {attachmentForm.formState.errors.url && (
                  <p className="text-sm text-destructive">
                    {attachmentForm.formState.errors.url.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Nota</Label>
                <Input placeholder="Opcional" {...attachmentForm.register("note")} />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAttachmentDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createAttachment.isPending}>
                {createAttachment.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletePaymentTarget}
        onOpenChange={(open) => !open && setDeletePaymentTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el pago y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletePromiseTarget}
        onOpenChange={(open) => !open && setDeletePromiseTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar promesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la promesa y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePromise}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteAttachmentTarget}
        onOpenChange={(open) => !open && setDeleteAttachmentTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar adjunto</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el adjunto y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAttachment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación de Pago Rápido */}
      <AlertDialog
        open={!!quickPayAmount}
        onOpenChange={(open) => !open && setQuickPayAmount(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar pago rápido</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Registrar un pago de{" "}
              <span className="font-semibold">
                {quickPayAmount && debt ? formatCurrency(quickPayAmount, debt.currency) : ""}
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
    </div>
  )
}

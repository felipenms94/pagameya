"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { DebtProgressCompact } from "@/components/ui/debt-progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/toast"
import {
  useDebts,
  useCreateDebt,
  useUpdateDebt,
  useDeleteDebt,
  usePersons,
} from "@/hooks"
import type { DebtDTO, DebtDirection, DebtStatus } from "@/lib/types"
import { Eye, Pencil, Trash2, Plus, Loader2, X } from "lucide-react"

const debtSchemaBase = z.object({
  personId: z.string().min(1, "Selecciona una persona"),
  direction: z.enum(["RECEIVABLE", "PAYABLE"]),
  title: z.string().optional(),
  description: z.string().optional(),
  amountOriginal: z.coerce.number().min(0.01, "Monto requerido"),
  dueDate: z.string().optional(),
  currency: z.string().min(1),
  type: z.enum(["CREDIT", "LOAN", "SERVICE", "OTHER"]),
  hasInterest: z.boolean(),
  interestRatePct: z.coerce.number().min(0, "Debe ser positivo").max(100, "Máximo 100%").optional().or(z.literal("")),
  interestPeriod: z.enum(["MONTHLY"]).optional(),
  splitCount: z.coerce.number().int().min(1, "Mínimo 1 cuota").max(60, "Máximo 60 cuotas").optional().or(z.literal("")),
  minSuggestedPayment: z.coerce.number().min(0.01, "Debe ser mayor a 0").optional().or(z.literal("")),
})

const debtSchema = debtSchemaBase.superRefine((data, ctx) => {
  if (data.hasInterest && (data.interestRatePct === undefined || data.interestRatePct === "" || data.interestRatePct <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Ingrese el % mensual de interés",
      path: ["interestRatePct"],
    })
  }
})

type DebtFormValues = z.infer<typeof debtSchemaBase>

const statusLabels: Record<DebtStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagada",
  OVERDUE: "Vencida",
}

const statusVariant: Record<DebtStatus, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  PAID: "outline",
  OVERDUE: "destructive",
}

const directionLabels: Record<DebtDirection, string> = {
  RECEIVABLE: "Por cobrar",
  PAYABLE: "Por pagar",
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

function formatInputDate(dateString: string | null) {
  if (!dateString) return ""
  return new Date(dateString).toISOString().slice(0, 10)
}

function toLocalDateIso(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toISOString()
}

export default function DeudasPage() {
  const { toast } = useToast()
  const { data: persons } = usePersons()
  const [filters, setFilters] = useState({
    direction: undefined as DebtDirection | undefined,
    status: undefined as DebtStatus | undefined,
    overdue: false,
    personId: undefined as string | undefined,
  })

  const { data: debts = [], isLoading } = useDebts(filters)
  const createDebt = useCreateDebt()
  const updateDebt = useUpdateDebt()
  const deleteDebt = useDeleteDebt()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDebt, setEditingDebt] = useState<DebtDTO | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DebtDTO | null>(null)

  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      personId: "",
      direction: "RECEIVABLE",
      title: "",
      description: "",
      amountOriginal: 0,
      dueDate: "",
      currency: "USD",
      type: "CREDIT",
      hasInterest: false,
      interestRatePct: undefined,
      interestPeriod: undefined,
      splitCount: undefined,
      minSuggestedPayment: undefined,
    },
  })

  const peopleOptions = useMemo(() => persons ?? [], [persons])

  const openCreateDialog = () => {
    setEditingDebt(null)
    form.reset({
      personId: "",
      direction: "RECEIVABLE",
      title: "",
      description: "",
      amountOriginal: 0,
      dueDate: "",
      currency: "USD",
      type: "CREDIT",
      hasInterest: false,
      interestRatePct: undefined,
      interestPeriod: undefined,
      splitCount: undefined,
      minSuggestedPayment: undefined,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (debt: DebtDTO) => {
    setEditingDebt(debt)
    form.reset({
      personId: debt.personId,
      direction: debt.direction,
      title: debt.title ?? "",
      description: debt.description ?? "",
      amountOriginal: debt.amountOriginal,
      dueDate: formatInputDate(debt.dueDate),
      currency: debt.currency ?? "USD",
      type: (debt.type as DebtFormValues["type"]) ?? "CREDIT",
      hasInterest: debt.hasInterest ?? false,
      interestRatePct: debt.interestRatePct ?? undefined,
      interestPeriod: (debt.interestPeriod as DebtFormValues["interestPeriod"]) ?? undefined,
      splitCount: debt.splitCount ?? undefined,
      minSuggestedPayment: debt.minSuggestedPayment ?? undefined,
    })
    setDialogOpen(true)
  }

  const onSubmit = async (data: DebtFormValues) => {
    const interestRatePct = typeof data.interestRatePct === "number" ? data.interestRatePct : null
    const splitCount = typeof data.splitCount === "number" ? data.splitCount : null
    const minSuggestedPayment = typeof data.minSuggestedPayment === "number" ? data.minSuggestedPayment : null

    const payload = {
      personId: data.personId,
      direction: data.direction,
      title: data.title || null,
      description: data.description || null,
      amountOriginal: data.amountOriginal,
      dueDate: data.dueDate ? toLocalDateIso(data.dueDate) : null,
      currency: data.currency,
      type: data.type,
      hasInterest: data.hasInterest,
      interestRatePct: data.hasInterest ? interestRatePct : null,
      interestPeriod: data.hasInterest ? (data.interestPeriod ?? null) : null,
      splitCount,
      minSuggestedPayment,
    }

    try {
      if (editingDebt) {
        await updateDebt.mutateAsync({ id: editingDebt.id, data: payload })
        toast("Deuda actualizada correctamente", "success")
      } else {
        await createDebt.mutateAsync(payload)
        toast("Deuda creada correctamente", "success")
      }
      setDialogOpen(false)
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al guardar deuda",
        "error"
      )
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteDebt.mutateAsync(deleteTarget.id)
      toast("Deuda eliminada correctamente", "success")
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al eliminar deuda",
        "error"
      )
    } finally {
      setDeleteTarget(null)
    }
  }

  const isPending = createDebt.isPending || updateDebt.isPending

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Deudas</h2>
          <p className="text-muted-foreground">
            Administra todas las deudas activas.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva deuda
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Refina la lista de deudas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Direccion</Label>
              <Select
                value={filters.direction ?? "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    direction: value === "all" ? undefined : (value as DebtDirection),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="RECEIVABLE">Por cobrar</SelectItem>
                  <SelectItem value="PAYABLE">Por pagar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={filters.status ?? "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: value === "all" ? undefined : (value as DebtStatus),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PENDING">Pendiente</SelectItem>
                  <SelectItem value="OVERDUE">Vencida</SelectItem>
                  <SelectItem value="PAID">Pagada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Persona</Label>
              <Select
                value={filters.personId ?? "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    personId: value === "all" ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {peopleOptions.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={filters.overdue}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      overdue: event.target.checked,
                    }))
                  }
                />
                Solo vencidas
              </label>
              {(filters.direction || filters.status || filters.personId || filters.overdue) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFilters({
                      direction: undefined,
                      status: undefined,
                      personId: undefined,
                      overdue: false,
                    })
                  }
                >
                  <X className="mr-1 h-4 w-4" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Deudas</CardTitle>
          <CardDescription>
            Personas con saldos pendientes o por pagar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead>Titulo</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Direccion</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-2 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-24 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : debts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg font-medium text-muted-foreground">
                No hay deudas registradas
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Crea una nueva deuda para empezar.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead>Titulo</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Direccion</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.map((debt) => (
                  <TableRow key={debt.id}>
                    <TableCell>
                      <div>
                        <Link
                          href={`/app/personas/${debt.personId}`}
                          className="font-medium hover:underline"
                        >
                          {debt.person.name}
                        </Link>
                        {debt.person.phone && (
                          <p className="text-xs text-muted-foreground">
                            {debt.person.phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/app/deudas/${debt.id}`}
                        className="font-medium hover:underline"
                      >
                        {debt.title || `Deuda #${debt.id.slice(0, 6)}`}
                      </Link>
                      {debt.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                          {debt.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(debt.balance, debt.currency)}
                    </TableCell>
                    <TableCell>
                      <DebtProgressCompact
                        amountOriginal={debt.amountOriginal}
                        balance={debt.balance}
                      />
                    </TableCell>
                    <TableCell>{formatDate(debt.dueDate)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[debt.status]}>
                        {statusLabels[debt.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{directionLabels[debt.direction]}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/app/deudas/${debt.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(debt)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(debt)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {editingDebt ? "Editar deuda" : "Nueva deuda"}
              </DialogTitle>
              <DialogDescription>
                {editingDebt
                  ? "Modifica los datos de la deuda."
                  : "Registra una deuda nueva."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Persona *</Label>
                <Select
                  value={form.watch("personId")}
                  onValueChange={(value) => form.setValue("personId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una persona" />
                  </SelectTrigger>
                  <SelectContent>
                    {peopleOptions.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.personId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.personId.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Direccion</Label>
                <Select
                  value={form.watch("direction")}
                  onValueChange={(value) =>
                    form.setValue("direction", value as DebtDirection)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona direccion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEIVABLE">Por cobrar</SelectItem>
                    <SelectItem value="PAYABLE">Por pagar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Titulo</Label>
                <Input
                  placeholder="Ej: Compra fiada"
                  {...form.register("title")}
                />
              </div>

              <div className="grid gap-2">
                <Label>Descripcion</Label>
                <Input
                  placeholder="Notas adicionales..."
                  {...form.register("description")}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Monto *</Label>
                  <Input type="number" step="0.01" {...form.register("amountOriginal")} />
                  {form.formState.errors.amountOriginal && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.amountOriginal.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Vence</Label>
                  <Input type="date" {...form.register("dueDate")} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Moneda</Label>
                  <Select
                    value={form.watch("currency")}
                    onValueChange={(value) => form.setValue("currency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Tipo</Label>
                  <Select
                    value={form.watch("type")}
                    onValueChange={(value) =>
                      form.setValue("type", value as DebtFormValues["type"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de deuda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREDIT">Credito</SelectItem>
                      <SelectItem value="LOAN">Prestamo</SelectItem>
                      <SelectItem value="SERVICE">Servicio</SelectItem>
                      <SelectItem value="OTHER">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Intereses */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Con intereses</Label>
                  <p className="text-xs text-muted-foreground">
                    Activar para aplicar interés a esta deuda
                  </p>
                </div>
                <Switch
                  checked={form.watch("hasInterest")}
                  onCheckedChange={(checked) => form.setValue("hasInterest", checked)}
                />
              </div>

              {form.watch("hasInterest") && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>% Mensual *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ej: 5"
                      {...form.register("interestRatePct")}
                    />
                    {form.formState.errors.interestRatePct && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.interestRatePct.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label>Periodo</Label>
                    <Select
                      value={form.watch("interestPeriod") || "MONTHLY"}
                      onValueChange={(value) =>
                        form.setValue("interestPeriod", value as DebtFormValues["interestPeriod"])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona periodo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTHLY">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Cuotas */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label># Cuotas</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    max="60"
                    placeholder="Opcional (máx. 60)"
                    {...form.register("splitCount")}
                  />
                  {form.formState.errors.splitCount ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.splitCount.message}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Deja vacío para pago único
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Abono mínimo sugerido</Label>
                  <Input type="number" step="0.01" min="0.01" {...form.register("minSuggestedPayment")} />
                  {form.formState.errors.minSuggestedPayment && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.minSuggestedPayment.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingDebt ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar deuda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la deuda y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

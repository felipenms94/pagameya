"use client"

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DebtProgressCard } from "@/components/ui/debt-progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  PersonFormDialog,
  TagCreateDialog,
  PriorityBadge,
  TagBadge,
} from "@/components/persons"
import {
  usePerson,
  useDeletePerson,
  useTags,
  useAssignTagToPerson,
  useRemoveTagFromPerson,
  useDebts,
} from "@/hooks"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  Star,
  Plus,
  Calendar,
  FileText,
  TrendingUp,
  TrendingDown,
  Eye,
} from "lucide-react"

function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function PersonDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const personId = params.id as string

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [debtFilter, setDebtFilter] = useState<"pending" | "paid" | "all">("pending")

  const { data: person, isLoading } = usePerson(personId)
  const { data: allTags } = useTags()
  const { data: personDebts } = useDebts({ personId })
  const deletePerson = useDeletePerson()
  const assignTag = useAssignTagToPerson()
  const removeTag = useRemoveTagFromPerson()

  // Calculate debt totals and history for this person
  const debtStats = useMemo(() => {
    if (!personDebts || personDebts.length === 0) {
      return null
    }

    const receivable = personDebts.filter((d) => d.direction === "RECEIVABLE")
    const payable = personDebts.filter((d) => d.direction === "PAYABLE")
    const pending = personDebts.filter((d) => d.status !== "PAID")
    const paid = personDebts.filter((d) => d.status === "PAID")

    const calcTotals = (debts: typeof personDebts) => ({
      amountOriginal: debts.reduce((sum, d) => sum + d.amountOriginal, 0),
      balance: debts.reduce((sum, d) => sum + d.balance, 0),
      paid: debts.reduce((sum, d) => sum + (d.amountOriginal - d.balance), 0),
    })

    return {
      receivable: calcTotals(receivable),
      payable: calcTotals(payable),
      all: calcTotals(personDebts),
      // Historical stats
      history: {
        totalCollected: calcTotals(receivable).paid, // Lo que me ha pagado
        totalPaidOut: calcTotals(payable).paid,      // Lo que le he pagado
        completedCount: paid.length,
        pendingCount: pending.length,
        totalCount: personDebts.length,
      },
    }
  }, [personDebts])

  // For backwards compatibility
  const debtTotals = debtStats

  // Filter debts based on selected tab
  const filteredDebts = useMemo(() => {
    if (!personDebts) return []
    switch (debtFilter) {
      case "pending":
        return personDebts.filter((d) => d.status !== "PAID")
      case "paid":
        return personDebts.filter((d) => d.status === "PAID")
      case "all":
      default:
        return personDebts
    }
  }, [personDebts, debtFilter])

  // Tags that are not yet assigned to this person
  const availableTags = allTags?.filter(
    (tag) => !person?.tags.some((pt) => pt.id === tag.id)
  )

  const handleAssignTag = async (tagId: string) => {
    if (!person) return
    try {
      await assignTag.mutateAsync({ personId: person.id, tagId })
      toast("Tag asignado correctamente", "success")
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al asignar tag",
        "error"
      )
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    if (!person) return
    try {
      await removeTag.mutateAsync({ personId: person.id, tagId })
      toast("Tag removido correctamente", "success")
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al remover tag",
        "error"
      )
    }
  }

  const handleDelete = async () => {
    if (!person) return
    try {
      await deletePerson.mutateAsync(person.id)
      toast("Persona eliminada correctamente", "success")
      router.push("/app/personas")
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al eliminar persona",
        "error"
      )
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!person) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Persona no encontrada.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">{person.name}</h2>
            {person.isFavorite && (
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Person Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Priority */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Prioridad</span>
              <PriorityBadge priority={person.priority} />
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Teléfono</span>
              {person.phone ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{person.phone}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>

            {/* Email */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              {person.email ? (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{person.email}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>

            {/* Created At */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Creado</span>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {new Date(person.createdAt).toLocaleDateString("es-EC", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Notes */}
            {person.notesInternal && (
              <div className="pt-4 border-t">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm font-medium">Notas internas</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {person.notesInternal}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tags Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Tags</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTagDialogOpen(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Crear Tag
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Tags */}
            <div>
              <span className="text-sm text-muted-foreground">
                Tags asignados
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {person.tags.length > 0 ? (
                  person.tags.map((tag) => (
                    <TagBadge
                      key={tag.id}
                      tag={tag}
                      removable
                      onRemove={() => handleRemoveTag(tag.id)}
                    />
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Sin tags asignados
                  </span>
                )}
              </div>
            </div>

            {/* Add Tag */}
            {availableTags && availableTags.length > 0 && (
              <div className="pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  Agregar tag
                </span>
                <Select onValueChange={handleAssignTag}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Seleccionar tag..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        <div className="flex items-center gap-2">
                          {tag.color && (
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                          )}
                          {tag.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {availableTags?.length === 0 && allTags && allTags.length > 0 && (
              <p className="text-sm text-muted-foreground pt-4 border-t">
                Todos los tags ya están asignados.
              </p>
            )}

            {allTags?.length === 0 && (
              <p className="text-sm text-muted-foreground pt-4 border-t">
                No hay tags creados. Crea uno usando el botón de arriba.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Debt Summary Card */}
      {personDebts && personDebts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Cuenta</CardTitle>
            <CardDescription>
              Estado financiero con {person.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Me debe */}
              <div className="rounded-lg border bg-blue-50/50 p-4">
                <div className="flex items-center gap-2 text-blue-600">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm font-medium">Me debe</span>
                </div>
                <p className="text-2xl font-bold text-blue-700 mt-1">
                  {formatCurrency(debtTotals?.receivable.balance ?? 0)}
                </p>
                <p className="text-xs text-blue-600/70">
                  de {formatCurrency(debtTotals?.receivable.amountOriginal ?? 0)} original
                </p>
              </div>

              {/* Le debo */}
              <div className="rounded-lg border bg-violet-50/50 p-4">
                <div className="flex items-center gap-2 text-violet-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Le debo</span>
                </div>
                <p className="text-2xl font-bold text-violet-700 mt-1">
                  {formatCurrency(debtTotals?.payable.balance ?? 0)}
                </p>
                <p className="text-xs text-violet-600/70">
                  de {formatCurrency(debtTotals?.payable.amountOriginal ?? 0)} original
                </p>
              </div>

              {/* Balance Neto */}
              <div className={`rounded-lg border p-4 ${
                (debtTotals?.receivable.balance ?? 0) - (debtTotals?.payable.balance ?? 0) >= 0
                  ? "bg-green-50/50"
                  : "bg-red-50/50"
              }`}>
                <div className={`flex items-center gap-2 ${
                  (debtTotals?.receivable.balance ?? 0) - (debtTotals?.payable.balance ?? 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}>
                  <span className="text-sm font-medium">Balance Neto</span>
                </div>
                <p className={`text-2xl font-bold mt-1 ${
                  (debtTotals?.receivable.balance ?? 0) - (debtTotals?.payable.balance ?? 0) >= 0
                    ? "text-green-700"
                    : "text-red-700"
                }`}>
                  {formatCurrency(
                    (debtTotals?.receivable.balance ?? 0) - (debtTotals?.payable.balance ?? 0)
                  )}
                </p>
                <p className={`text-xs ${
                  (debtTotals?.receivable.balance ?? 0) - (debtTotals?.payable.balance ?? 0) >= 0
                    ? "text-green-600/70"
                    : "text-red-600/70"
                }`}>
                  {(debtTotals?.receivable.balance ?? 0) - (debtTotals?.payable.balance ?? 0) >= 0
                    ? "A tu favor"
                    : "En tu contra"}
                </p>
              </div>
            </div>

            {/* Historical Stats */}
            {debtStats?.history && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">Historial</p>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(debtStats.history.totalCollected)}
                    </p>
                    <p className="text-xs text-muted-foreground">Me ha pagado</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-violet-600">
                      {formatCurrency(debtStats.history.totalPaidOut)}
                    </p>
                    <p className="text-xs text-muted-foreground">Le he pagado</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">
                      {debtStats.history.completedCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Completadas</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-amber-600">
                      {debtStats.history.pendingCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Pendientes</p>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bars */}
            {debtTotals && debtTotals.all.amountOriginal > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">Progreso de Pagos</p>
                <DebtProgressCard
                  amountOriginal={debtTotals.all.amountOriginal}
                  balance={debtTotals.all.balance}
                  currency="USD"
                />
              </div>
            )}

            {/* Debts List with Tabs */}
            <div className="pt-4 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <p className="text-sm font-medium">Deudas ({personDebts.length})</p>
                <Tabs value={debtFilter} onValueChange={(v) => setDebtFilter(v as typeof debtFilter)}>
                  <TabsList className="grid w-full sm:w-auto grid-cols-3">
                    <TabsTrigger value="pending" className="text-xs">
                      Pendientes ({debtStats?.history.pendingCount ?? 0})
                    </TabsTrigger>
                    <TabsTrigger value="paid" className="text-xs">
                      Pagadas ({debtStats?.history.completedCount ?? 0})
                    </TabsTrigger>
                    <TabsTrigger value="all" className="text-xs">
                      Todas
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {filteredDebts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {debtFilter === "pending" && "No hay deudas pendientes"}
                  {debtFilter === "paid" && "No hay deudas pagadas"}
                  {debtFilter === "all" && "No hay deudas"}
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDebts.map((debt) => (
                      <TableRow key={debt.id}>
                        <TableCell>
                          <p className="font-medium">
                            {debt.title || `Deuda #${debt.id.slice(0, 6)}`}
                          </p>
                          {debt.dueDate && (
                            <p className="text-xs text-muted-foreground">
                              Vence: {new Date(debt.dueDate).toLocaleDateString("es-EC", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={debt.direction === "RECEIVABLE" ? "default" : "secondary"}>
                            {debt.direction === "RECEIVABLE" ? "Me debe" : "Le debo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {debt.status === "PAID" ? (
                            <span className="text-green-600">
                              {formatCurrency(debt.amountOriginal)}
                            </span>
                          ) : (
                            formatCurrency(debt.balance)
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              debt.status === "PAID"
                                ? "default"
                                : debt.status === "OVERDUE"
                                ? "destructive"
                                : "outline"
                            }
                            className={debt.status === "PAID" ? "bg-green-500" : ""}
                          >
                            {debt.status === "PAID"
                              ? "Pagado"
                              : debt.status === "OVERDUE"
                              ? "Vencido"
                              : "Pendiente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/app/deudas/${debt.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <PersonFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        person={person}
      />

      {/* Tag Create Dialog */}
      <TagCreateDialog
        open={isTagDialogOpen}
        onOpenChange={setIsTagDialogOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar persona?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará a <strong>{person.name}</strong> y no se
              puede deshacer. Las deudas asociadas permanecerán en el sistema.
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

"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/toast"
import { usePaymentTypes, useCreatePaymentType, useDeletePaymentType } from "@/hooks"
import { Loader2, Plus, Trash2 } from "lucide-react"

export default function PagosConfigPage() {
  const { toast } = useToast()
  const { data: paymentTypes = [], isLoading } = usePaymentTypes()
  const createPaymentType = useCreatePaymentType()
  const deletePaymentType = useDeletePaymentType()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [name, setName] = useState("")

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      await createPaymentType.mutateAsync(name.trim())
      toast("Forma de pago creada", "success")
      setName("")
      setDialogOpen(false)
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al crear forma de pago",
        "error"
      )
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deletePaymentType.mutateAsync(deleteTarget)
      toast("Forma de pago eliminada", "success")
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al eliminar forma de pago",
        "error"
      )
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Formas de pago</h2>
          <p className="text-muted-foreground">
            Gestiona formas de pago personalizadas.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Crear forma de pago
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Formas activas en el workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : paymentTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay formas registradas.</p>
          ) : (
            <div className="space-y-2">
              {paymentTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{type.name}</span>
                    <Badge variant={type.isSystem ? "secondary" : "outline"}>
                      {type.isSystem ? "Sistema" : "Custom"}
                    </Badge>
                  </div>
                  {!type.isSystem && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(type.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Nueva forma de pago</DialogTitle>
            <DialogDescription>Agrega una forma personalizada.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label>Nombre</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Pago en tienda"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createPaymentType.isPending}>
              {createPaymentType.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar forma de pago</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará la forma de pago.
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

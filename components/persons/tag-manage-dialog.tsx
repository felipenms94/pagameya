"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/toast"
import { useTags, useDeleteTag } from "@/hooks"
import { Trash2, Plus } from "lucide-react"
import type { Tag } from "@/lib/types"

type TagManageDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateClick: () => void
}

export function TagManageDialog({
  open,
  onOpenChange,
  onCreateClick,
}: TagManageDialogProps) {
  const { toast } = useToast()
  const { data: tags, isLoading } = useTags()
  const deleteTag = useDeleteTag()
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null)

  const handleDelete = async () => {
    if (!deletingTag) return
    try {
      await deleteTag.mutateAsync(deletingTag.id)
      toast("Tag eliminado correctamente", "success")
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al eliminar tag",
        "error"
      )
    } finally {
      setDeletingTag(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Administrar Tags</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Create button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onOpenChange(false)
                onCreateClick()
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear nuevo tag
            </Button>

            {/* Tags list */}
            <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-8 w-8" />
                    </div>
                  ))}
                </div>
              ) : tags && tags.length > 0 ? (
                tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color || "#6b7280" }}
                      />
                      <span className="font-medium">{tag.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingTag(tag)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  No hay tags creados
                </div>
              )}
            </div>

            {tags && tags.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                {tags.length} tag{tags.length !== 1 ? "s" : ""} en total
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingTag}
        onOpenChange={() => setDeletingTag(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tag?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el tag{" "}
              <strong>{deletingTag?.name}</strong> y lo removerá de todas las
              personas que lo tengan asignado.
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
    </>
  )
}

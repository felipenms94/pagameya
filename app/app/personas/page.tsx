"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  TagManageDialog,
  PersonsTable,
} from "@/components/persons"
import { usePersons, useDeletePerson, useTags } from "@/hooks"
import { Search, Plus, X, Tags } from "lucide-react"
import type { Person, Priority, PersonsFilter } from "@/lib/types"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"

export default function PersonasPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [priorityFilter, setPriorityFilter] = useState<Priority | "ALL">("ALL")
  const [tagFilter, setTagFilter] = useState<string>("ALL")

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isTagManageOpen, setIsTagManageOpen] = useState(false)
  const [isTagCreateOpen, setIsTagCreateOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [deletingPerson, setDeletingPerson] = useState<Person | null>(null)

  const deletePerson = useDeletePerson()
  const { data: tags } = useTags()

  const filters: PersonsFilter = useMemo(() => ({
    search: debouncedSearch || undefined,
    priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
    tagId: tagFilter !== "ALL" ? tagFilter : undefined,
  }), [debouncedSearch, priorityFilter, tagFilter])

  const { data: persons, isLoading } = usePersons(filters)

  const handleEdit = (person: Person) => {
    setEditingPerson(person)
    setIsFormOpen(true)
  }

  const handleDelete = (person: Person) => {
    setDeletingPerson(person)
  }

  const confirmDelete = async () => {
    if (!deletingPerson) return
    try {
      await deletePerson.mutateAsync(deletingPerson.id)
      toast("Persona eliminada correctamente", "success")
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al eliminar persona",
        "error"
      )
    } finally {
      setDeletingPerson(null)
    }
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingPerson(null)
  }

  const clearFilters = () => {
    setSearch("")
    setPriorityFilter("ALL")
    setTagFilter("ALL")
  }

  const hasFilters = search || priorityFilter !== "ALL" || tagFilter !== "ALL"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Personas</h2>
          <p className="text-muted-foreground">
            Gestiona las personas con las que tienes deudas o cobros.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsTagManageOpen(true)}>
            <Tags className="mr-2 h-4 w-4" />
            Tags
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Persona
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Priority Filter */}
            <Select
              value={priorityFilter}
              onValueChange={(v) => setPriorityFilter(v as Priority | "ALL")}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="LOW">Baja</SelectItem>
                <SelectItem value="MEDIUM">Media</SelectItem>
                <SelectItem value="HIGH">Alta</SelectItem>
              </SelectContent>
            </Select>

            {/* Tag Filter */}
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los tags</SelectItem>
                {tags?.map((tag) => (
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

            {/* Clear Filters */}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <PersonsTable
            persons={persons ?? []}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <PersonFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        person={editingPerson}
      />

      {/* Tag Manage Dialog */}
      <TagManageDialog
        open={isTagManageOpen}
        onOpenChange={setIsTagManageOpen}
        onCreateClick={() => setIsTagCreateOpen(true)}
      />

      {/* Tag Create Dialog */}
      <TagCreateDialog
        open={isTagCreateOpen}
        onOpenChange={setIsTagCreateOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingPerson}
        onOpenChange={() => setDeletingPerson(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar persona?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará a <strong>{deletingPerson?.name}</strong> y
              no se puede deshacer. Las deudas asociadas permanecerán en el
              sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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

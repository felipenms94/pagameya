"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { useCreatePerson, useUpdatePerson } from "@/hooks"
import type { Person, Priority } from "@/lib/types"
import { Loader2 } from "lucide-react"

const personSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  notesInternal: z.string().optional(),
  isFavorite: z.boolean(),
})

type PersonFormValues = z.infer<typeof personSchema>

type PersonFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  person?: Person | null
}

export function PersonFormDialog({
  open,
  onOpenChange,
  person,
}: PersonFormDialogProps) {
  const { toast } = useToast()
  const createPerson = useCreatePerson()
  const updatePerson = useUpdatePerson()

  const isEditing = !!person

  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      priority: "MEDIUM",
      notesInternal: "",
      isFavorite: false,
    },
  })

  useEffect(() => {
    if (person) {
      form.reset({
        name: person.name,
        phone: person.phone || "",
        email: person.email || "",
        priority: person.priority,
        notesInternal: person.notesInternal || "",
        isFavorite: person.isFavorite,
      })
    } else {
      form.reset({
        name: "",
        phone: "",
        email: "",
        priority: "MEDIUM",
        notesInternal: "",
        isFavorite: false,
      })
    }
  }, [person, form])

  const onSubmit = async (data: PersonFormValues) => {
    try {
      const payload = {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        priority: data.priority as Priority,
        notesInternal: data.notesInternal || null,
        isFavorite: data.isFavorite,
      }

      if (isEditing && person) {
        await updatePerson.mutateAsync({ id: person.id, data: payload })
        toast("Persona actualizada correctamente", "success")
      } else {
        await createPerson.mutateAsync(payload)
        toast("Persona creada correctamente", "success")
      }
      onOpenChange(false)
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al guardar persona",
        "error"
      )
    }
  }

  const isPending = createPerson.isPending || updatePerson.isPending

  const watchedPriority = useWatch({
    control: form.control,
    name: "priority",
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Persona" : "Nueva Persona"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Modifica los datos de la persona."
                : "Completa los datos para crear una nueva persona."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="Ej: Juan Pérez"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                placeholder="Ej: 0999999999"
                {...form.register("phone")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Ej: juan@ejemplo.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select
                value={watchedPriority}
                onValueChange={(value) =>
                  form.setValue("priority", value as Priority)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Baja</SelectItem>
                  <SelectItem value="MEDIUM">Media</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notesInternal">Notas internas</Label>
              <Input
                id="notesInternal"
                placeholder="Notas privadas..."
                {...form.register("notesInternal")}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isFavorite"
                className="h-4 w-4 rounded border-gray-300"
                {...form.register("isFavorite")}
              />
              <Label htmlFor="isFavorite" className="font-normal">
                Marcar como favorito
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

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
import { useToast } from "@/components/ui/toast"
import { useCreateTag } from "@/hooks"
import { Loader2 } from "lucide-react"

const tagSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  color: z.string().optional(),
})

type TagFormValues = z.infer<typeof tagSchema>

const colorOptions = [
  { value: "#ef4444", label: "Rojo" },
  { value: "#f97316", label: "Naranja" },
  { value: "#eab308", label: "Amarillo" },
  { value: "#22c55e", label: "Verde" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#8b5cf6", label: "Violeta" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#6b7280", label: "Gris" },
]

type TagCreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TagCreateDialog({ open, onOpenChange }: TagCreateDialogProps) {
  const { toast } = useToast()
  const createTag = useCreateTag()

  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: "",
      color: "#3b82f6",
    },
  })

  const onSubmit = async (data: TagFormValues) => {
    try {
      await createTag.mutateAsync({
        name: data.name,
        color: data.color || null,
      })
      toast("Tag creado correctamente", "success")
      form.reset()
      onOpenChange(false)
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al crear tag",
        "error"
      )
    }
  }

  const watchedColor = useWatch({
    control: form.control,
    name: "color",
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[350px]">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Nuevo Tag</DialogTitle>
            <DialogDescription>
              Crea un nuevo tag para organizar personas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tagName">Nombre *</Label>
              <Input
                id="tagName"
                placeholder="Ej: VIP, Moroso, etc."
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${
                      watchedColor === color.value
                        ? "scale-110 border-foreground"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => form.setValue("color", color.value)}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createTag.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createTag.isPending}>
              {createTag.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

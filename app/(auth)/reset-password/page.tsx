"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { Loader2, ArrowLeft } from "lucide-react"
import { Suspense } from "react"

const schema = z
  .object({
    token: z.string().min(1, "Token requerido"),
    newPassword: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

type FormValues = z.infer<typeof schema>

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      token: searchParams.get("token") ?? "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: data.token,
          newPassword: data.newPassword,
        }),
      })
      const json = await response.json().catch(() => null)

      if (!response.ok || !json?.ok) {
        toast(json?.error?.message ?? "Error al restablecer contraseña", "error")
        setIsLoading(false)
        return
      }

      toast("Contraseña restablecida con éxito. Inicia sesión.", "success")
      router.push("/login")
    } catch {
      toast("Error de conexión", "error")
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="token">Token</Label>
        <Input
          id="token"
          type="text"
          placeholder="Pega tu token aquí"
          {...form.register("token")}
          disabled={isLoading}
        />
        {form.formState.errors.token && (
          <p className="text-sm text-destructive">
            {form.formState.errors.token.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">Nueva contraseña</Label>
        <Input
          id="newPassword"
          type="password"
          placeholder="******"
          {...form.register("newPassword")}
          disabled={isLoading}
        />
        {form.formState.errors.newPassword && (
          <p className="text-sm text-destructive">
            {form.formState.errors.newPassword.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="******"
          {...form.register("confirmPassword")}
          disabled={isLoading}
        />
        {form.formState.errors.confirmPassword && (
          <p className="text-sm text-destructive">
            {form.formState.errors.confirmPassword.message}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLoading ? "Restableciendo..." : "Restablecer contraseña"}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-brand-foreground font-bold text-xl">
            P
          </div>
          <CardTitle className="text-2xl font-bold">Nueva contraseña</CardTitle>
          <CardDescription>
            Ingresa tu token y tu nueva contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-64 animate-pulse rounded bg-muted" />}>
            <ResetPasswordForm />
          </Suspense>
          <div className="mt-4 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              <ArrowLeft className="h-3 w-3" />
              Volver al login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState } from "react"
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

const schema = z.object({
  email: z.string().min(1, "Email requerido").email("Email inválido"),
})

type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [devToken, setDevToken] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)
    setDevToken(null)

    try {
      const response = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email.trim().toLowerCase() }),
      })
      const json = await response.json().catch(() => null)

      if (!response.ok || !json?.ok) {
        toast(json?.error?.message ?? "Error al solicitar restablecimiento", "error")
        setIsLoading(false)
        return
      }

      setSubmitted(true)
      toast("Si el email existe, recibirás instrucciones para restablecer tu contraseña.", "success")

      if (process.env.NODE_ENV === "development" && json.data?.token) {
        setDevToken(json.data.token)
      }
    } catch {
      toast("Error de conexión", "error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-brand-foreground font-bold text-xl">
            P
          </div>
          <CardTitle className="text-2xl font-bold">Restablecer contraseña</CardTitle>
          <CardDescription>
            Ingresa tu email y te enviaremos instrucciones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!submitted ? (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  {...form.register("email")}
                  disabled={isLoading}
                  autoFocus
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Enviando..." : "Enviar instrucciones"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
              </p>
              {devToken && (
                <Card className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      [DEV] Token de restablecimiento:
                    </p>
                    <code className="block break-all rounded bg-amber-100 p-2 text-xs dark:bg-amber-900">
                      {devToken}
                    </code>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href={`/reset-password?token=${encodeURIComponent(devToken)}`}>
                        Ir a restablecer
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
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

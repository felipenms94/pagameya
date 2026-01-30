"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import { Loader2, AlertTriangle } from "lucide-react"

const loginSchema = z.object({
  email: z.string().min(1, "Email requerido").email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [mustReset, setMustReset] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          password: data.password,
        }),
      })
      const json = await response.json().catch(() => null)

      if (!response.ok || !json?.ok) {
        if (json?.error?.code === "PASSWORD_RESET_REQUIRED") {
          setMustReset(true)
          setError("")
        } else {
          setMustReset(false)
          setError(json?.error?.message ?? "Credenciales inválidas")
          toast(json?.error?.message ?? "Credenciales inválidas", "error")
        }
        setIsLoading(false)
        return
      }

      localStorage.removeItem("workspace_id")
      localStorage.removeItem("workspace_name")
      localStorage.removeItem("workspace_mode")
      router.push("/select-workspace")
    } catch {
      setError("Error al iniciar sesión")
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
          <CardTitle className="text-2xl font-bold">PagameYA</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="******"
                {...form.register("password")}
                disabled={isLoading}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            {mustReset && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Debes cambiar tu contraseña para continuar.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/forgot-password">Restablecer contraseña</Link>
                  </Button>
                </div>
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-brand underline-offset-4 hover:underline">
              Crear cuenta
            </Link>
          </div>
          <div className="mt-2 text-center text-sm">
            <Link href="/forgot-password" className="text-muted-foreground underline-offset-4 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

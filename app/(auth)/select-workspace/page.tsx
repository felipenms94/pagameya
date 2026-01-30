"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, User, ChevronRight, AlertCircle } from "lucide-react"
import { api } from "@/lib/apiClient"

type Workspace = {
  id: string
  name: string
  mode: "BUSINESS" | "PERSONAL"
  createdAt: string
  role: string
}

async function fetchWorkspaces(): Promise<Workspace[]> {
  return api.get<Workspace[]>("/workspaces", { includeWorkspace: false })
}

export default function SelectWorkspacePage() {
  const router = useRouter()
  const [isAuthReady, setIsAuthReady] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" })
        if (!response.ok) {
          router.replace("/login")
          return
        }
        setIsAuthReady(true)
      } catch {
        router.replace("/login")
      }
    }

    void checkAuth()
  }, [router])

  const { data: workspaces, isLoading, error } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => fetchWorkspaces(),
    enabled: isAuthReady,
  })

  const handleSelectWorkspace = (workspace: Workspace) => {
    localStorage.setItem("workspace_id", workspace.id)
    localStorage.setItem("workspace_name", workspace.name)
    localStorage.setItem("workspace_mode", workspace.mode)
    router.push("/app/dashboard")
  }

  const handleLogout = () => {
    localStorage.removeItem("workspace_id")
    localStorage.removeItem("workspace_name")
    localStorage.removeItem("workspace_mode")
    fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      router.push("/login")
    })
  }

  if (!isAuthReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-brand" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-brand-foreground font-bold text-xl">
            P
          </div>
          <CardTitle className="text-2xl font-bold">Selecciona un Workspace</CardTitle>
          <CardDescription>
            Elige el workspace con el que deseas trabajar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">{error.message}</p>
            </div>
          )}

          {workspaces && workspaces.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No tienes workspaces disponibles.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Contacta al administrador para ser agregado a uno.
              </p>
            </div>
          )}

          {workspaces && workspaces.length > 0 && (
            <div className="space-y-2">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => handleSelectWorkspace(workspace)}
                  className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    {workspace.mode === "BUSINESS" ? (
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{workspace.name}</span>
                      <Badge variant={workspace.mode === "BUSINESS" ? "business" : "personal"}>
                        {workspace.mode === "BUSINESS" ? "Negocio" : "Personal"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Rol: {workspace.role}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          <div className="pt-4 border-t">
            <Button variant="ghost" className="w-full" onClick={handleLogout}>
              Cambiar usuario
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import {
  Building2,
  User,
  ChevronRight,
  AlertCircle,
  Plus,
  Loader2,
} from "lucide-react"
import { useWorkspaces, useCreateWorkspace } from "@/hooks"
import { ApiError } from "@/lib/apiClient"
import type { Workspace } from "@/hooks"

function setWorkspaceInStorage(workspace: Workspace) {
  localStorage.setItem("workspace_id", workspace.id)
  localStorage.setItem("workspace_name", workspace.name)
  localStorage.setItem("workspace_mode", workspace.mode)
}

function clearWorkspaceFromStorage() {
  localStorage.removeItem("workspace_id")
  localStorage.removeItem("workspace_name")
  localStorage.removeItem("workspace_mode")
}

type WorkspaceItemProps = {
  workspace: Workspace
  onSelect: (workspace: Workspace) => void
}

function WorkspaceItem({ workspace, onSelect }: WorkspaceItemProps) {
  return (
    <button
      onClick={() => onSelect(workspace)}
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
          <Badge
            variant={workspace.mode === "BUSINESS" ? "business" : "personal"}
          >
            {workspace.mode === "BUSINESS" ? "Negocio" : "Personal"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Rol: {workspace.role}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  )
}

export default function SelectWorkspacePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [isCreatingPersonal, setIsCreatingPersonal] = useState(false)
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false)
  const [businessName, setBusinessName] = useState("")
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false)

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

  const {
    data: workspaces,
    isLoading,
    error,
    refetch,
  } = useWorkspaces(isAuthReady)
  const createWorkspace = useCreateWorkspace()

  // Separate personal and business workspaces
  const personalWorkspace = workspaces?.find((w) => w.mode === "PERSONAL")
  const businessWorkspaces = workspaces?.filter((w) => w.mode === "BUSINESS") ?? []
  const hasPersonal = !!personalWorkspace
  const hasAnyWorkspace = workspaces && workspaces.length > 0

  const handleSelectWorkspace = (workspace: Workspace) => {
    setWorkspaceInStorage(workspace)
    router.push("/app/dashboard")
  }

  const handleCreatePersonal = async () => {
    setIsCreatingPersonal(true)
    try {
      const workspace = await createWorkspace.mutateAsync({
        name: "Personal",
        mode: "PERSONAL",
      })
      setWorkspaceInStorage(workspace)
      router.push("/app/dashboard")
    } catch (err) {
      if (err instanceof ApiError && err.code === "PERSONAL_WORKSPACE_ALREADY_EXISTS") {
        toast("Ya tienes un workspace personal", "error")
        refetch()
      } else {
        toast(
          err instanceof Error ? err.message : "Error al crear workspace",
          "error"
        )
      }
      setIsCreatingPersonal(false)
    }
  }

  const handleCreateBusiness = async () => {
    if (!businessName.trim()) return

    setIsCreatingBusiness(true)
    try {
      const workspace = await createWorkspace.mutateAsync({
        name: businessName.trim(),
        mode: "BUSINESS",
      })
      setWorkspaceInStorage(workspace)
      router.push("/app/dashboard")
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al crear negocio",
        "error"
      )
      setIsCreatingBusiness(false)
    }
  }

  const handleOpenBusinessDialog = () => {
    setBusinessName("")
    setIsBusinessDialogOpen(true)
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      clearWorkspaceFromStorage()
      router.push("/login")
    }
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
          <CardTitle className="text-2xl font-bold">
            {!hasAnyWorkspace
              ? "Crea tu primer Workspace"
              : "Selecciona un Workspace"}
          </CardTitle>
          <CardDescription>
            {!hasAnyWorkspace
              ? "Elige el tipo de cuenta para comenzar"
              : "Elige el workspace con el que deseas trabajar"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
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

          {/* Personal Section */}
          {!isLoading && !error && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal
              </h3>
              {hasPersonal ? (
                <WorkspaceItem
                  workspace={personalWorkspace}
                  onSelect={handleSelectWorkspace}
                />
              ) : (
                <button
                  onClick={handleCreatePersonal}
                  disabled={isCreatingPersonal}
                  className="flex w-full items-center gap-4 rounded-lg border-2 border-dashed p-4 text-left transition-colors hover:border-brand hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    {isCreatingPersonal ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">Crear Personal</span>
                    <p className="text-xs text-muted-foreground">
                      Para uso individual
                    </p>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Business Section */}
          {!isLoading && !error && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Negocios
              </h3>
              {businessWorkspaces.map((workspace) => (
                <WorkspaceItem
                  key={workspace.id}
                  workspace={workspace}
                  onSelect={handleSelectWorkspace}
                />
              ))}
              <button
                onClick={handleOpenBusinessDialog}
                disabled={createWorkspace.isPending}
                className="flex w-full items-center gap-4 rounded-lg border-2 border-dashed p-4 text-left transition-colors hover:border-brand hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <span className="font-medium">Crear nuevo negocio</span>
                  <p className="text-xs text-muted-foreground">
                    Para tu empresa o equipo
                  </p>
                </div>
              </button>
            </div>
          )}

          <div className="border-t pt-4">
            <Button variant="ghost" className="w-full" onClick={handleLogout}>
              Cambiar usuario
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Business Dialog */}
      <Dialog open={isBusinessDialogOpen} onOpenChange={setIsBusinessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo negocio</DialogTitle>
            <DialogDescription>
              Ingresa el nombre de tu negocio o empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="business-name">Nombre del negocio</Label>
              <Input
                id="business-name"
                placeholder="Mi Empresa"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && businessName.trim()) {
                    handleCreateBusiness()
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBusinessDialogOpen(false)}
              disabled={isCreatingBusiness}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateBusiness}
              disabled={!businessName.trim() || isCreatingBusiness}
            >
              {isCreatingBusiness ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear negocio"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

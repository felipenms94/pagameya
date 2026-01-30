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
import { Skeleton } from "@/components/ui/skeleton"
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
import type { Workspace, WorkspaceMode } from "@/hooks"

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

type CreateWorkspaceButtonProps = {
  mode: WorkspaceMode
  label: string
  icon: React.ReactNode
  isLoading: boolean
  loadingMode: WorkspaceMode | null
  onClick: () => void
}

function CreateWorkspaceButton({
  mode,
  label,
  icon,
  isLoading,
  loadingMode,
  onClick,
}: CreateWorkspaceButtonProps) {
  const isThisLoading = isLoading && loadingMode === mode
  const isDisabled = isLoading

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors hover:border-brand hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
        {isThisLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          icon
        )}
      </div>
      <span className="font-medium">{label}</span>
    </button>
  )
}

export default function SelectWorkspacePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [creatingMode, setCreatingMode] = useState<WorkspaceMode | null>(null)

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

  const { data: workspaces, isLoading, error } = useWorkspaces(isAuthReady)
  const createWorkspace = useCreateWorkspace()

  const handleSelectWorkspace = (workspace: Workspace) => {
    setWorkspaceInStorage(workspace)
    router.push("/app/dashboard")
  }

  const handleCreateWorkspace = async (mode: WorkspaceMode) => {
    const name = mode === "PERSONAL" ? "Personal" : "Negocio"
    setCreatingMode(mode)
    try {
      const workspace = await createWorkspace.mutateAsync({ name, mode })
      setWorkspaceInStorage(workspace)
      router.push("/app/dashboard")
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al crear workspace",
        "error"
      )
      setCreatingMode(null)
    }
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

  const hasWorkspaces = workspaces && workspaces.length > 0
  const isEmpty = workspaces && workspaces.length === 0

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-brand-foreground font-bold text-xl">
            P
          </div>
          <CardTitle className="text-2xl font-bold">
            {isEmpty ? "Crea tu primer Workspace" : "Selecciona un Workspace"}
          </CardTitle>
          <CardDescription>
            {isEmpty
              ? "Elige el tipo de cuenta que mejor se adapte a tus necesidades"
              : "Elige el workspace con el que deseas trabajar"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {/* Empty state - create first workspace */}
          {isEmpty && (
            <div className="grid grid-cols-2 gap-4">
              <CreateWorkspaceButton
                mode="PERSONAL"
                label="Personal"
                icon={<User className="h-6 w-6 text-muted-foreground" />}
                isLoading={createWorkspace.isPending}
                loadingMode={creatingMode}
                onClick={() => handleCreateWorkspace("PERSONAL")}
              />
              <CreateWorkspaceButton
                mode="BUSINESS"
                label="Negocio"
                icon={<Building2 className="h-6 w-6 text-muted-foreground" />}
                isLoading={createWorkspace.isPending}
                loadingMode={creatingMode}
                onClick={() => handleCreateWorkspace("BUSINESS")}
              />
            </div>
          )}

          {/* Workspace list */}
          {hasWorkspaces && (
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
                      <Badge
                        variant={
                          workspace.mode === "BUSINESS" ? "business" : "personal"
                        }
                      >
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

              {/* Create new workspace button */}
              <div className="pt-2">
                <button
                  onClick={() => handleCreateWorkspace("PERSONAL")}
                  disabled={createWorkspace.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:border-brand hover:text-foreground disabled:opacity-50"
                >
                  {createWorkspace.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Crear nuevo workspace
                </button>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <Button variant="ghost" className="w-full" onClick={handleLogout}>
              Cambiar usuario
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/toast"
import {
  Building2,
  User,
  Mail,
  Bell,
  ChevronDown,
  Check,
  Settings,
  Loader2,
} from "lucide-react"
import { usePendingInvitations, useAlerts, useWorkspaces } from "@/hooks"
import type { Workspace } from "@/hooks"

type WorkspaceMode = "BUSINESS" | "PERSONAL"

function getWorkspaceIdSnapshot() {
  return localStorage.getItem("workspace_id") ?? ""
}
function getWorkspaceNameSnapshot() {
  return localStorage.getItem("workspace_name") ?? ""
}
function getWorkspaceModeSnapshot() {
  return localStorage.getItem("workspace_mode") as WorkspaceMode | null
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}
const getServerIdSnapshot = () => ""
const getServerSnapshot = () => ""
const getServerModeSnapshot = () => null

function setWorkspaceInStorage(workspace: Workspace) {
  localStorage.setItem("workspace_id", workspace.id)
  localStorage.setItem("workspace_name", workspace.name)
  localStorage.setItem("workspace_mode", workspace.mode)
  // Dispatch storage event so useSyncExternalStore picks it up
  window.dispatchEvent(new Event("storage"))
}

// Query keys to invalidate when switching workspace
const WORKSPACE_QUERY_KEYS = [
  "dashboard",
  "today",
  "alerts",
  "internal-reminders",
  "members",
  "email-settings",
  "email-logs",
  "reminder-templates",
  "persons",
  "debts",
  "tags",
  "payment-types",
  "activity",
  "suggested-reminders",
  "reminders",
]

export function Topbar() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: pendingInvitations = [] } = usePendingInvitations()
  const { data: alerts } = useAlerts()
  const { data: workspaces, isLoading: workspacesLoading, error: workspacesError } = useWorkspaces()

  const workspaceId = useSyncExternalStore(subscribe, getWorkspaceIdSnapshot, getServerIdSnapshot)
  const workspaceName = useSyncExternalStore(subscribe, getWorkspaceNameSnapshot, getServerSnapshot)
  const workspaceMode = useSyncExternalStore(subscribe, getWorkspaceModeSnapshot, getServerModeSnapshot)

  const handleSelectWorkspace = async (workspace: Workspace) => {
    if (workspace.id === workspaceId) return

    try {
      // Save to localStorage
      setWorkspaceInStorage(workspace)

      // Invalidate all workspace-related queries
      await Promise.all(
        WORKSPACE_QUERY_KEYS.map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] })
        )
      )

      // Navigate to dashboard and refresh
      router.push("/app/dashboard")
      router.refresh()
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al cambiar workspace",
        "error"
      )
    }
  }

  const handleManageWorkspaces = () => {
    router.push("/select-workspace")
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold">
                {workspaceName || "Workspace"}
              </h1>
              {workspaceMode && (
                <Badge
                  variant={workspaceMode === "BUSINESS" ? "business" : "personal"}
                >
                  {workspaceMode === "BUSINESS" ? (
                    <>
                      <Building2 className="mr-1 h-3 w-3" />
                      Negocio
                    </>
                  ) : (
                    <>
                      <User className="mr-1 h-3 w-3" />
                      Personal
                    </>
                  )}
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Cambiar workspace</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {workspacesLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {workspacesError && (
            <div className="px-2 py-3 text-sm text-destructive">
              Error al cargar workspaces
            </div>
          )}

          {workspaces?.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => handleSelectWorkspace(ws)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                {ws.mode === "BUSINESS" ? (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ws.name}</p>
                <p className="text-xs text-muted-foreground">
                  {ws.mode === "BUSINESS" ? "Negocio" : "Personal"} · {ws.role}
                </p>
              </div>
              {ws.id === workspaceId && (
                <Check className="h-4 w-4 text-brand" />
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleManageWorkspaces}
            className="cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            Administrar workspaces
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-2">
        {(() => {
          const s = alerts?.summary
          const total = s
            ? s.receivable.overdueCount +
              s.receivable.dueTodayCount +
              s.receivable.dueSoonCount +
              s.receivable.highPriorityCount +
              s.receivable.promiseTodayCount +
              s.payable.overdueCount +
              s.payable.dueTodayCount +
              s.payable.dueSoonCount +
              s.payable.highPriorityCount +
              s.payable.promiseTodayCount
            : 0
          if (total === 0) return null
          return (
            <Link
              href="/app/cobrar-hoy"
              className="relative flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Bell className="h-4 w-4" />
              <Badge
                variant="destructive"
                className="h-5 min-w-5 px-1 text-[10px]"
              >
                {total}
              </Badge>
            </Link>
          )
        })()}
        {pendingInvitations.length > 0 && (
          <Link
            href="/app/invitaciones"
            className="relative flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Mail className="h-4 w-4" />
            <Badge
              variant="destructive"
              className="h-5 min-w-5 px-1 text-[10px]"
            >
              {pendingInvitations.length}
            </Badge>
          </Link>
        )}
      </div>
    </header>
  )
}

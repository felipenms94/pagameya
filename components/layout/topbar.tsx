"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Building2, User, Mail, Bell } from "lucide-react"
import { usePendingInvitations, useAlerts } from "@/hooks"

type WorkspaceMode = "BUSINESS" | "PERSONAL"

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
const getServerSnapshot = () => ""
const getServerModeSnapshot = () => null

export function Topbar() {
  const { data: pendingInvitations = [] } = usePendingInvitations()
  const { data: alerts } = useAlerts()
  const workspaceName = useSyncExternalStore(subscribe, getWorkspaceNameSnapshot, getServerSnapshot)
  const workspaceMode = useSyncExternalStore(subscribe, getWorkspaceModeSnapshot, getServerModeSnapshot)

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">{workspaceName || "Workspace"}</h1>
        {workspaceMode && (
          <Badge variant={workspaceMode === "BUSINESS" ? "business" : "personal"}>
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
      <div className="flex items-center gap-2">
        {(() => {
          const s = alerts?.summary
          const total = s
            ? s.receivable.overdueCount + s.receivable.dueTodayCount + s.receivable.dueSoonCount + s.receivable.highPriorityCount + s.receivable.promiseTodayCount +
              s.payable.overdueCount + s.payable.dueTodayCount + s.payable.dueSoonCount + s.payable.highPriorityCount + s.payable.promiseTodayCount
            : 0
          if (total === 0) return null
          return (
            <Link
              href="/app/cobrar-hoy"
              className="relative flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Bell className="h-4 w-4" />
              <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px]">
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
            <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px]">
              {pendingInvitations.length}
            </Badge>
          </Link>
        )}
      </div>
    </header>
  )
}

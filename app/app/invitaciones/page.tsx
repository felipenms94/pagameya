"use client"

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
import { usePendingInvitations, useAcceptInvitation } from "@/hooks"
import { Loader2, MailOpen } from "lucide-react"

export default function InvitacionesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: invitations = [], isLoading, isError } = usePendingInvitations()
  const acceptInvitation = useAcceptInvitation()

  const handleAccept = async (id: string) => {
    try {
      await acceptInvitation.mutateAsync(id)
      toast("Invitación aceptada", "success")
      router.push("/select-workspace")
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Error al aceptar invitación",
        "error"
      )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Invitaciones</h2>
        <p className="text-muted-foreground">
          Invitaciones pendientes a workspaces.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pendientes</CardTitle>
          <CardDescription>
            Acepta para unirte a un workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-muted-foreground">
              No se pudieron cargar las invitaciones.
            </p>
          ) : invitations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <MailOpen className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No tienes invitaciones pendientes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{inv.workspaceName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Invitado por {inv.invitedBy}</span>
                      <Badge variant="outline">{inv.role}</Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(inv.id)}
                    disabled={acceptInvitation.isPending}
                  >
                    {acceptInvitation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Aceptar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

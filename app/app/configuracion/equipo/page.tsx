"use client"

import { useState, useMemo, useSyncExternalStore } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/toast"
import {
  useMembers,
  useUpdateMemberRole,
  useRemoveMember,
  useCurrentWorkspaceRole,
  useCurrentUser,
  useInvitations,
  useCreateInvitation,
  useRevokeInvitation,
  useDebouncedValue,
  MEMBER_ROLES,
} from "@/hooks"
import type { MemberDTO, Invitation } from "@/hooks"
import { ApiError } from "@/lib/apiClient"
import {
  Loader2,
  Send,
  Trash2,
  Lock,
  ShieldAlert,
  UserMinus,
  Search,
  Users,
} from "lucide-react"

/* ── Constants ─────────────────────────────────────────── */

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Miembro",
  VIEWER: "Viewer",
}

const ROLE_ORDER: Record<string, number> = {
  OWNER: 0,
  ADMIN: 1,
  MEMBER: 2,
  VIEWER: 3,
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptada",
  REVOKED: "Revocada",
  EXPIRED: "Expirada",
}

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  ACCEPTED: 1,
  REVOKED: 2,
  EXPIRED: 3,
}

const INVITABLE_ROLES = MEMBER_ROLES.filter((r) => r !== "OWNER")

const inviteSchema = z.object({
  email: z.string().min(1, "Email requerido").email("Email inválido"),
  role: z.enum(["ADMIN", "MEMBER"] as const),
})

type InviteFormValues = z.infer<typeof inviteSchema>

/* ── Helpers ───────────────────────────────────────────── */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function roleBadgeVariant(role: string) {
  switch (role) {
    case "OWNER":
      return "default" as const
    case "ADMIN":
      return "business" as const
    default:
      return "secondary" as const
  }
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "PENDING":
      return "outline" as const
    case "ACCEPTED":
      return "personal" as const
    case "REVOKED":
    case "EXPIRED":
      return "destructive" as const
    default:
      return "secondary" as const
  }
}

function sortMembers(members: MemberDTO[]): MemberDTO[] {
  return [...members].sort((a, b) => {
    const roleDiff = (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)
    if (roleDiff !== 0) return roleDiff
    const nameA = (a.name ?? a.email).toLowerCase()
    const nameB = (b.name ?? b.email).toLowerCase()
    return nameA.localeCompare(nameB)
  })
}

function sortInvitations(invitations: Invitation[]): Invitation[] {
  return [...invitations].sort((a, b) => {
    const statusDiff =
      (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    if (statusDiff !== 0) return statusDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

/* ── Shared components ─────────────────────────────────── */

const subscribeToStorage = (callback: () => void) => {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}
const getWorkspaceModeSnapshot = () => localStorage.getItem("workspace_mode")
const getServerModeSnapshot = () => null

function BusinessGate({ children }: { children: React.ReactNode }) {
  const mode = useSyncExternalStore(subscribeToStorage, getWorkspaceModeSnapshot, getServerModeSnapshot)

  if (mode === null) {
    return null
  }

  if (mode !== "BUSINESS") {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="max-w-sm text-center">
          <CardContent className="pt-6">
            <Lock className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">Disponible en modo negocio</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cambia tu workspace a modo negocio para gestionar equipo.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

function ForbiddenBanner() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
      <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="text-sm text-amber-800 dark:text-amber-200">
        No tienes permisos para gestionar el equipo de este workspace.
      </p>
    </div>
  )
}

/* ── Members ───────────────────────────────────────────── */

function MemberRow({
  member,
  isOwner,
  isSelf,
}: {
  member: MemberDTO
  isOwner: boolean
  isSelf: boolean
}) {
  const { toast } = useToast()
  const updateRole = useUpdateMemberRole()
  const removeMember = useRemoveMember()
  const [removeTarget, setRemoveTarget] = useState(false)

  const canManage = isOwner && member.role !== "OWNER" && !isSelf
  const rowBusy = updateRole.isPending || removeMember.isPending

  const handleRoleChange = async (newRole: string) => {
    if (newRole === member.role) return
    try {
      await updateRole.mutateAsync({
        userId: member.userId,
        role: newRole as "ADMIN" | "MEMBER",
      })
      toast("Rol actualizado", "success")
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al cambiar rol",
        "error"
      )
    }
  }

  const handleRemove = async () => {
    try {
      await removeMember.mutateAsync(member.userId)
      toast("Miembro expulsado del workspace", "success")
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al expulsar miembro",
        "error"
      )
    } finally {
      setRemoveTarget(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">
            {member.name ?? member.email}
          </span>
          {member.name && (
            <span className="text-xs text-muted-foreground truncate">
              {member.email}
            </span>
          )}
          {isSelf && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Tú
            </Badge>
          )}
          <Badge variant={roleBadgeVariant(member.role)}>
            {ROLE_LABELS[member.role] ?? member.role}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(member.joinedAt)}
          </span>
        </div>

        {canManage && (
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <Select
              value={member.role}
              onValueChange={handleRoleChange}
              disabled={rowBusy}
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                {updateRole.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MEMBER">Miembro</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
              onClick={() => setRemoveTarget(true)}
              disabled={rowBusy}
            >
              {removeMember.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserMinus className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={removeTarget} onOpenChange={setRemoveTarget}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Expulsar miembro</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas expulsar a{" "}
              <span className="font-medium">{member.email}</span> del workspace?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Expulsar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function MembersSummary({ members }: { members: MemberDTO[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const m of members) {
      map[m.role] = (map[m.role] ?? 0) + 1
    }
    return map
  }, [members])

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Users className="h-4 w-4" />
        <span className="font-medium">{members.length}</span>
        <span>miembros</span>
      </div>
      {Object.entries(counts).map(([role, count]) => (
        <Badge key={role} variant={roleBadgeVariant(role)} className="text-xs">
          {count} {ROLE_LABELS[role] ?? role}
        </Badge>
      ))}
    </div>
  )
}

function MembersTab() {
  const { data: members = [], isLoading, isError, error } = useMembers()
  const { data: currentRole } = useCurrentWorkspaceRole()
  const { data: currentUser } = useCurrentUser()
  const isOwner = currentRole === "OWNER"
  const isForbidden =
    isError &&
    error instanceof ApiError &&
    (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED")

  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)

  const filteredMembers = useMemo(() => {
    const sorted = sortMembers(members)
    if (!debouncedSearch) return sorted
    const q = debouncedSearch.toLowerCase()
    return sorted.filter(
      (m) =>
        m.email.toLowerCase().includes(q) ||
        (m.name && m.name.toLowerCase().includes(q))
    )
  }, [members, debouncedSearch])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Miembros</CardTitle>
        <CardDescription>Usuarios con acceso al workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isForbidden ? (
          <ForbiddenBanner />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            No se pudieron cargar los miembros.
          </p>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay miembros en este workspace.
            </p>
            <p className="text-xs text-muted-foreground">
              Invita a alguien desde la pestaña Invitaciones.
            </p>
          </div>
        ) : (
          <>
            <MembersSummary members={members} />

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {filteredMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No se encontraron miembros con &quot;{debouncedSearch}&quot;.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((member) => (
                  <MemberRow
                    key={member.userId}
                    member={member}
                    isOwner={isOwner}
                    isSelf={member.userId === currentUser?.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Invitations ───────────────────────────────────────── */

function InvitationRow({
  inv,
  onRevoke,
  revoking,
}: {
  inv: Invitation
  onRevoke: (id: string) => void
  revoking: boolean
}) {
  const remaining =
    inv.status === "PENDING" && inv.expiresAt ? daysUntil(inv.expiresAt) : null

  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <span className="text-sm font-medium truncate">{inv.email}</span>
        <Badge variant={roleBadgeVariant(inv.role)}>
          {ROLE_LABELS[inv.role] ?? inv.role}
        </Badge>
        <Badge variant={statusBadgeVariant(inv.status)}>
          {STATUS_LABELS[inv.status] ?? inv.status}
        </Badge>
        {remaining !== null && (
          <span className="text-xs text-muted-foreground">
            Expira en {remaining} {remaining === 1 ? "día" : "días"}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {formatDate(inv.createdAt)}
        </span>
      </div>
      {inv.status === "PENDING" && (
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 text-destructive hover:text-destructive ml-2"
          onClick={() => onRevoke(inv.id)}
          disabled={revoking}
        >
          {revoking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  )
}

function InvitationsTab() {
  const { toast } = useToast()
  const { data: invitations = [], isLoading, isError, error } = useInvitations()
  const createInvitation = useCreateInvitation()
  const revokeInvitation = useRevokeInvitation()
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null)

  const isForbidden =
    isError &&
    error instanceof ApiError &&
    (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED")

  const sortedInvitations = useMemo(
    () => sortInvitations(invitations),
    [invitations]
  )

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "MEMBER" },
  })

  const onSubmit = async (data: InviteFormValues) => {
    try {
      await createInvitation.mutateAsync({
        email: data.email.trim().toLowerCase(),
        role: data.role,
      })
      toast("Invitación enviada", "success")
      form.reset()
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al enviar invitación",
        "error"
      )
    }
  }

  const handleRevoke = async () => {
    if (!revokeTarget) return
    try {
      await revokeInvitation.mutateAsync(revokeTarget)
      toast("Invitación revocada", "success")
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al revocar",
        "error"
      )
    } finally {
      setRevokeTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      {isForbidden ? (
        <ForbiddenBanner />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Invitar miembro</CardTitle>
              <CardDescription>
                Envía una invitación por email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <div className="flex-1 space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colega@email.com"
                    {...form.register("email")}
                    disabled={createInvitation.isPending}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="w-full space-y-2 sm:w-40">
                  <Label>Rol</Label>
                  <Controller
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={createInvitation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INVITABLE_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABELS[role] ?? role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <Button type="submit" disabled={createInvitation.isPending}>
                  {createInvitation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Invitar
                </Button>
              </form>
              <p className="text-xs text-muted-foreground">
                La invitación expira en 7 días.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invitaciones enviadas</CardTitle>
              <CardDescription>
                Invitaciones y su estado actual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : sortedInvitations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay invitaciones.
                </p>
              ) : (
                <div className="space-y-2">
                  {sortedInvitations.map((inv) => (
                    <InvitationRow
                      key={inv.id}
                      inv={inv}
                      onRevoke={setRevokeTarget}
                      revoking={
                        revokeInvitation.isPending &&
                        revokeTarget === inv.id
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revocar invitación</AlertDialogTitle>
            <AlertDialogDescription>
              La invitación dejará de ser válida. ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────── */

export default function EquipoConfigPage() {
  const [tab, setTab] = useState("miembros")

  return (
    <BusinessGate>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Equipo</h2>
          <p className="text-muted-foreground">
            Gestiona los miembros e invitaciones de tu workspace.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="miembros">Miembros</TabsTrigger>
            <TabsTrigger value="invitaciones">Invitaciones</TabsTrigger>
          </TabsList>
          <TabsContent value="miembros">
            <MembersTab />
          </TabsContent>
          <TabsContent value="invitaciones">
            <InvitationsTab />
          </TabsContent>
        </Tabs>
      </div>
    </BusinessGate>
  )
}

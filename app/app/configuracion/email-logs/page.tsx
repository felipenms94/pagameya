/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useMemo, useCallback, useRef, useSyncExternalStore, useEffect } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { LoadError } from "@/components/ui/load-error"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useEmailLogs, useDebouncedValue } from "@/hooks"
import {
  Search,
  Lock,
  ShieldAlert,
  Loader2,
  X,
  Eye,
  Inbox,
} from "lucide-react"
import { ApiError } from "@/lib/apiClient"
import type {
  OutboundMessageType,
  OutboundMessageDirection,
  OutboundMessageStatus,
  OutboundMessageLogDTO,
} from "@/lib/types"

const TYPE_LABELS: Record<OutboundMessageType, string> = {
  TEST: "Test",
  DAILY: "Diario",
  WEEKLY: "Semanal",
}

const DIRECTION_LABELS: Record<OutboundMessageDirection, string> = {
  ALL: "Todas",
  RECEIVABLE: "Por Cobrar",
  PAYABLE: "Por Pagar",
}

const STATUS_VARIANT: Record<
  OutboundMessageStatus,
  "default" | "destructive" | "outline"
> = {
  SENT: "default",
  FAILED: "destructive",
  SKIPPED: "outline",
}

const STATUS_LABELS: Record<OutboundMessageStatus, string> = {
  SENT: "Enviado",
  FAILED: "Fallido",
  SKIPPED: "Omitido",
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

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
              Cambia tu workspace a modo negocio para ver el historial de
              emails.
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
        Solo OWNER o ADMIN puede ver el historial de emails.
      </p>
    </div>
  )
}

function LogDetailDialog({ log }: { log: OutboundMessageLogDTO }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle de Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Para</p>
              <p className="font-medium">{log.to}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estado</p>
              <Badge variant={STATUS_VARIANT[log.status]}>
                {STATUS_LABELS[log.status]}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p>{TYPE_LABELS[log.type]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dirección</p>
              <p>{DIRECTION_LABELS[log.direction]}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Fecha</p>
              <p>{formatDateTime(log.sentAt ?? log.createdAt)}</p>
            </div>
          </div>

          {log.subject && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Asunto</p>
              <p className="text-sm font-medium">{log.subject}</p>
            </div>
          )}

          {log.bodyPreview && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Preview</p>
              <div className="rounded-lg border bg-muted/50 p-3">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {log.bodyPreview}
                </pre>
              </div>
            </div>
          )}

          {log.errorMessage && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Error</p>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">{log.errorMessage}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EmailLogsContent() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [typeFilter, setTypeFilter] = useState<OutboundMessageType | "ALL">(
    "ALL"
  )
  const [statusFilter, setStatusFilter] = useState<
    OutboundMessageStatus | "ALL"
  >("ALL")
  const [dirFilter, setDirFilter] = useState<
    OutboundMessageDirection | "ALL"
  >("ALL")

  // Accumulated items for cursor pagination
  const [cursors, setCursors] = useState<string[]>([])
  const currentCursor = cursors.length > 0 ? cursors[cursors.length - 1] : undefined

  const filters = useMemo(
    () => ({
      type: typeFilter === "ALL" ? undefined : typeFilter,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      direction: dirFilter === "ALL" ? undefined : (dirFilter as OutboundMessageDirection),
      q: debouncedSearch || undefined,
      limit: 20,
      cursor: currentCursor,
    }),
    [typeFilter, statusFilter, dirFilter, debouncedSearch, currentCursor]
  )

  const { data, isLoading, error, refetch } = useEmailLogs(filters)

  // Accumulate items across pages
  const [accumulatedItems, setAccumulatedItems] = useState<
    OutboundMessageLogDTO[]
  >([])
  const lastProcessedCursorRef = useRef<string | undefined>(undefined)

  // Reset accumulated when filters change (not cursor)
  const filterKey = `${typeFilter}:${statusFilter}:${dirFilter}:${debouncedSearch}`
  const prevFilterKeyRef = useRef(filterKey)

  useEffect(() => {
    if (filterKey !== prevFilterKeyRef.current) {
      prevFilterKeyRef.current = filterKey
      setAccumulatedItems([])
      setCursors([])
      lastProcessedCursorRef.current = undefined
    }
  }, [filterKey])

  // Append new items when data arrives for a new cursor
  useEffect(() => {
    if (data && currentCursor !== lastProcessedCursorRef.current) {
      lastProcessedCursorRef.current = currentCursor
      if (currentCursor) {
        setAccumulatedItems((prev) => [...prev, ...data.items])
      } else {
        setAccumulatedItems(data.items)
      }
    }
  }, [data, currentCursor])

  const displayItems =
    accumulatedItems.length > 0 ? accumulatedItems : data?.items ?? []

  const hasFilters =
    typeFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    dirFilter !== "ALL" ||
    search.trim() !== ""

  const clearFilters = useCallback(() => {
    setSearch("")
    setTypeFilter("ALL")
    setStatusFilter("ALL")
    setDirFilter("ALL")
  }, [])

  const handleLoadMore = () => {
    if (data?.nextCursor) {
      setCursors((prev) => [...prev, data.nextCursor!])
    }
  }

  // Handle forbidden
  if (error instanceof ApiError && (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED")) {
    return <ForbiddenBanner />
  }

  // Handle other errors
  if (error && !isLoading && displayItems.length === 0) {
    return (
      <LoadError
        error={error}
        onRetry={refetch}
        title="Error al cargar historial"
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por email o asunto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={typeFilter}
          onValueChange={(v) =>
            setTypeFilter(v as OutboundMessageType | "ALL")
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="TEST">Test</SelectItem>
            <SelectItem value="DAILY">Diario</SelectItem>
            <SelectItem value="WEEKLY">Semanal</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as OutboundMessageStatus | "ALL")
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="SENT">Enviado</SelectItem>
            <SelectItem value="FAILED">Fallido</SelectItem>
            <SelectItem value="SKIPPED">Omitido</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={dirFilter}
          onValueChange={(v) =>
            setDirFilter(v as OutboundMessageDirection | "ALL")
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Dirección" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="RECEIVABLE">Por Cobrar</SelectItem>
            <SelectItem value="PAYABLE">Por Pagar</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading && displayItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : displayItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No hay emails en el historial.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden sm:table-cell">Dir.</TableHead>
                  <TableHead>Para</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Asunto
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayItems.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDateTime(log.sentAt ?? log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {TYPE_LABELS[log.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs">
                      {DIRECTION_LABELS[log.direction]}
                    </TableCell>
                    <TableCell className="text-xs max-w-[140px] truncate">
                      {log.to}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs max-w-[200px] truncate">
                      {log.subject ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[log.status]}>
                        {STATUS_LABELS[log.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <LogDetailDialog log={log} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>

          {/* Load more */}
          {data?.nextCursor && (
            <div className="flex justify-center border-t p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Cargar más
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export default function EmailLogsPage() {
  return (
    <BusinessGate>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Historial de Emails
          </h2>
          <p className="text-muted-foreground">
            Registro de emails enviados desde tu workspace.
          </p>
        </div>
        <EmailLogsContent />
      </div>
    </BusinessGate>
  )
}

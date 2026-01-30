"use client"

import { useState, useMemo, useSyncExternalStore } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { LoadError } from "@/components/ui/load-error"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import {
  useEmailSettings,
  useUpdateEmailSettings,
  useSendTestEmail,
  useCurrentUser,
  useRunEmailNow,
} from "@/hooks"
import { ApiError } from "@/lib/apiClient"
import { Lock, ShieldAlert, Loader2, Send, Save, Play, Clock } from "lucide-react"
import type { EmailRecipientMode, EmailSettingsDTO } from "@/lib/types"

const HOURS = Array.from({ length: 24 }, (_, i) => i)

const DAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miercoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sabado" },
]

function formatHour(hour: number): string {
  const h = hour % 12 || 12
  const ampm = hour < 12 ? "AM" : "PM"
  return `${h}:00 ${ampm}`
}

function formatNextRun(isoString: string | null): string {
  if (!isoString) return "No programado"
  const date = new Date(isoString)
  return date.toLocaleDateString("es-EC", {
    weekday: "short",
    day: "numeric",
    month: "short",
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
    // Still hydrating or no mode set
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
              Cambia tu workspace a modo negocio para configurar emails
              automaticos.
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
        Solo OWNER o ADMIN puede configurar los emails automaticos.
      </p>
    </div>
  )
}

function validateEmails(text: string): { valid: string[]; invalid: string[] } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const valid: string[] = []
  const invalid: string[] = []
  for (const line of lines) {
    if (emailRegex.test(line)) {
      valid.push(line)
    } else {
      invalid.push(line)
    }
  }
  return { valid, invalid }
}

type EmailSettingsFormProps = {
  initialSettings: EmailSettingsDTO
}

function EmailSettingsForm({ initialSettings }: EmailSettingsFormProps) {
  const { toast } = useToast()
  const { data: currentUser } = useCurrentUser()
  const updateSettings = useUpdateEmailSettings()
  const sendTest = useSendTestEmail()
  const runNow = useRunEmailNow()

  // Track which type is being run
  const [runningType, setRunningType] = useState<"DAILY" | "WEEKLY" | null>(null)

  // Form state initialized from settings
  const [dailyEnabled, setDailyEnabled] = useState(initialSettings.dailyEnabled)
  const [dailyHour, setDailyHour] = useState(initialSettings.dailyHour)
  const [weeklyEnabled, setWeeklyEnabled] = useState(initialSettings.weeklyEnabled)
  const [weeklyDay, setWeeklyDay] = useState(initialSettings.weeklyDay)
  const [weeklyHour, setWeeklyHour] = useState(initialSettings.weeklyHour)
  const [recipientMode, setRecipientMode] = useState<EmailRecipientMode>(
    initialSettings.recipientMode
  )
  const [customRecipientsText, setCustomRecipientsText] = useState(
    initialSettings.customRecipients.join("\n")
  )

  // Dirty tracking
  const isDirty = useMemo(() => {
    const customRecipients = validateEmails(customRecipientsText).valid
    return (
      dailyEnabled !== initialSettings.dailyEnabled ||
      dailyHour !== initialSettings.dailyHour ||
      weeklyEnabled !== initialSettings.weeklyEnabled ||
      weeklyDay !== initialSettings.weeklyDay ||
      weeklyHour !== initialSettings.weeklyHour ||
      recipientMode !== initialSettings.recipientMode ||
      JSON.stringify(customRecipients.sort()) !==
        JSON.stringify([...initialSettings.customRecipients].sort())
    )
  }, [
    initialSettings,
    dailyEnabled,
    dailyHour,
    weeklyEnabled,
    weeklyDay,
    weeklyHour,
    recipientMode,
    customRecipientsText,
  ])

  // Validation
  const { valid: validEmails, invalid: invalidEmails } = useMemo(
    () => validateEmails(customRecipientsText),
    [customRecipientsText]
  )

  const hasValidationError =
    recipientMode === "CUSTOM" && invalidEmails.length > 0

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        dailyEnabled,
        dailyHour,
        weeklyEnabled,
        weeklyDay,
        weeklyHour,
        recipientMode,
        customRecipients: recipientMode === "CUSTOM" ? validEmails : [],
      })
      toast("Configuracion guardada", "success")
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar configuracion",
        "error"
      )
    }
  }

  const handleSendTest = async () => {
    const toEmail = currentUser?.email
    if (!toEmail) {
      toast("No se encontro tu email", "error")
      return
    }
    // Send test based on what's enabled - prefer daily, fallback to weekly
    const testType = dailyEnabled ? "DAILY" : weeklyEnabled ? "WEEKLY" : "DAILY"
    try {
      await sendTest.mutateAsync({
        toEmail,
        type: testType,
      })
      const typeLabel = testType === "DAILY" ? "diario" : "semanal"
      toast(`Email de prueba (${typeLabel}) enviado a ${toEmail}`, "success")
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al enviar email de prueba",
        "error"
      )
    }
  }

  const handleRunNow = async (type: "DAILY" | "WEEKLY") => {
    setRunningType(type)
    try {
      const result = await runNow.mutateAsync(type)
      const typeLabel = type === "DAILY" ? "diario" : "semanal"
      if (result.sent > 0 || result.failed > 0) {
        toast(
          `Resumen ${typeLabel}: ${result.sent} enviado(s), ${result.failed} fallido(s)`,
          result.failed > 0 ? "error" : "success"
        )
      } else {
        toast(`Resumen ${typeLabel} ejecutado (sin emails pendientes)`, "info")
      }
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al ejecutar emails",
        "error"
      )
    } finally {
      setRunningType(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Daily Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Resumen Diario</CardTitle>
          {initialSettings.dailyEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRunNow("DAILY")}
              disabled={runNow.isPending}
              className="gap-2"
            >
              {runningType === "DAILY" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Ejecutar ahora
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="daily-enabled">Activar resumen diario</Label>
              <p className="text-sm text-muted-foreground">
                Recibe un email diario con las deudas vencidas y por vencer.
              </p>
            </div>
            <Switch
              id="daily-enabled"
              checked={dailyEnabled}
              onCheckedChange={setDailyEnabled}
            />
          </div>

          {dailyEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="daily-hour">Hora de envio</Label>
                <Select
                  value={String(dailyHour)}
                  onValueChange={(v) => setDailyHour(Number(v))}
                >
                  <SelectTrigger id="daily-hour" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {formatHour(h)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {initialSettings.nextRunDailyAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Proximo envio: {formatNextRun(initialSettings.nextRunDailyAt)}
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Weekly Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Resumen Semanal</CardTitle>
          {initialSettings.weeklyEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRunNow("WEEKLY")}
              disabled={runNow.isPending}
              className="gap-2"
            >
              {runningType === "WEEKLY" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Ejecutar ahora
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weekly-enabled">Activar resumen semanal</Label>
              <p className="text-sm text-muted-foreground">
                Recibe un email semanal con el resumen de cobros y pagos.
              </p>
            </div>
            <Switch
              id="weekly-enabled"
              checked={weeklyEnabled}
              onCheckedChange={setWeeklyEnabled}
            />
          </div>

          {weeklyEnabled && (
            <>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="space-y-2">
                  <Label htmlFor="weekly-day">Dia de envio</Label>
                  <Select
                    value={String(weeklyDay)}
                    onValueChange={(v) => setWeeklyDay(Number(v))}
                  >
                    <SelectTrigger id="weekly-day" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weekly-hour">Hora de envio</Label>
                  <Select
                    value={String(weeklyHour)}
                    onValueChange={(v) => setWeeklyHour(Number(v))}
                  >
                    <SelectTrigger id="weekly-hour" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {formatHour(h)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {initialSettings.nextRunWeeklyAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Proximo envio: {formatNextRun(initialSettings.nextRunWeeklyAt)}
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Destinatarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient-mode">Enviar emails a</Label>
            <Select
              value={recipientMode}
              onValueChange={(v) => setRecipientMode(v as EmailRecipientMode)}
            >
              <SelectTrigger id="recipient-mode" className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OWNERS">Owners del workspace</SelectItem>
                <SelectItem value="CUSTOM">Lista personalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recipientMode === "CUSTOM" && (
            <div className="space-y-2">
              <Label htmlFor="custom-recipients">Emails (uno por linea)</Label>
              <Textarea
                id="custom-recipients"
                placeholder="email1@ejemplo.com&#10;email2@ejemplo.com"
                value={customRecipientsText}
                onChange={(e) => setCustomRecipientsText(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
              {invalidEmails.length > 0 && (
                <p className="text-sm text-destructive">
                  Emails invalidos: {invalidEmails.join(", ")}
                </p>
              )}
              {validEmails.length > 0 && invalidEmails.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {validEmails.length} email(s) configurado(s)
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={handleSendTest}
          disabled={sendTest.isPending}
          className="gap-2"
        >
          {sendTest.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Enviar prueba ahora
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isDirty || hasValidationError || updateSettings.isPending}
          className="gap-2"
        >
          {updateSettings.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar
        </Button>
      </div>
    </div>
  )
}

function EmailSettingsContent() {
  const { data: settings, isLoading, error, refetch } = useEmailSettings()

  // Handle forbidden
  if (
    error instanceof ApiError &&
    (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED")
  ) {
    return <ForbiddenBanner />
  }

  // Handle other errors
  if (error && !isLoading) {
    return (
      <LoadError
        error={error}
        onRetry={refetch}
        title="Error al cargar configuracion"
      />
    )
  }

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Use key to reset form when settings change from server
  const formKey = JSON.stringify(settings)

  return <EmailSettingsForm key={formKey} initialSettings={settings} />
}

export default function EmailSettingsPage() {
  return (
    <BusinessGate>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Configuracion de Emails
          </h2>
          <p className="text-muted-foreground">
            Configura los resumenes automaticos por email.
          </p>
        </div>
        <EmailSettingsContent />
      </div>
    </BusinessGate>
  )
}

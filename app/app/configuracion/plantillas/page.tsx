"use client"

import { useCallback, useMemo, useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  useReminderTemplates,
  useUpsertReminderTemplate,
  usePersons,
  useDebts,
  useWhatsappLink,
  useCurrentUser,
  useEmailPreview,
  useSendTestEmail,
} from "@/hooks"
import { useToast } from "@/components/ui/toast"
import {
  MessageCircle,
  Mail,
  Smartphone,
  Save,
  Loader2,
  Eye,
  Copy,
  ExternalLink,
  Send,
  Info,
} from "lucide-react"
import type {
  ReminderChannel,
  ReminderTone,
  DebtDTO,
  WhatsappTone,
  EmailPreviewType,
  DebtDirection,
} from "@/lib/types"

const CHANNELS: { value: ReminderChannel; label: string; icon: React.ElementType }[] = [
  { value: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { value: "EMAIL", label: "Email", icon: Mail },
  { value: "SMS", label: "SMS", icon: Smartphone },
]

const TONES: { value: ReminderTone; label: string }[] = [
  { value: "soft", label: "Suave" },
  { value: "normal", label: "Normal" },
  { value: "strong", label: "Fuerte" },
]

const VARIABLES = [
  "{personName}",
  "{balance}",
  "{debtTitle}",
  "{dueDate}",
  "{promisedDate}",
  "{totalDue}",
]

const TONE_TO_WHATSAPP: Record<ReminderTone, WhatsappTone> = {
  soft: "soft",
  normal: "normal",
  strong: "fuerte",
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function VariableChips() {
  const { toast } = useToast()

  const copyVariable = useCallback(
    (v: string) => {
      navigator.clipboard.writeText(v)
      toast(`${v} copiado`, "info")
    },
    [toast]
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Variables disponibles</CardTitle>
        <CardDescription className="text-xs">
          Haz clic para copiar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map((v) => (
            <Badge
              key={v}
              variant="secondary"
              className="cursor-pointer select-none gap-1 hover:bg-accent"
              onClick={() => copyVariable(v)}
            >
              <Copy className="h-3 w-3" />
              {v}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function renderPreview(
  body: string,
  debt: DebtDTO | null
): string {
  if (!debt) return body
  return body
    .replace(/\{personName\}/g, debt.person.name)
    .replace(/\{balance\}/g, formatCurrency(debt.balance))
    .replace(/\{debtTitle\}/g, debt.title ?? "Sin título")
    .replace(/\{dueDate\}/g, formatDate(debt.dueDate))
    .replace(/\{promisedDate\}/g, "—")
    .replace(/\{totalDue\}/g, formatCurrency(debt.totalDue))
}

function ChannelEditor({ channel }: { channel: ReminderChannel }) {
  const { data: templates, isLoading } = useReminderTemplates(channel)
  const upsert = useUpsertReminderTemplate()
  const { toast } = useToast()

  const [tone, setTone] = useState<ReminderTone>("soft")
  const [body, setBody] = useState("")
  const [title, setTitle] = useState("")
  const [dirty, setDirty] = useState(false)

  // Preview state
  const [previewPersonId, setPreviewPersonId] = useState<string | null>(null)
  const [previewDebtId, setPreviewDebtId] = useState<string | null>(null)
  const { data: persons } = usePersons()
  const { data: debts } = useDebts(
    previewPersonId ? { personId: previewPersonId } : {}
  )
  const whatsapp = useWhatsappLink()

  // Find matching template when tone changes
  const currentTemplate = useMemo(() => {
    return templates?.find((t) => t.tone === tone) ?? null
  }, [templates, tone])

  // Sync editor with template when tone or templates change
  const [lastLoadedKey, setLastLoadedKey] = useState("")
  const loadKey = `${channel}:${tone}:${currentTemplate?.updatedAt ?? "none"}`
  if (loadKey !== lastLoadedKey) {
    setLastLoadedKey(loadKey)
    setBody(currentTemplate?.body ?? "")
    setTitle(currentTemplate?.title ?? "")
    setDirty(false)
  }

  const selectedDebt: DebtDTO | null = useMemo(() => {
    if (!previewDebtId || !debts) return null
    return debts.find((d) => d.id === previewDebtId) ?? null
  }, [debts, previewDebtId])

  const previewText = useMemo(
    () => renderPreview(body, selectedDebt),
    [body, selectedDebt]
  )

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        channel,
        tone,
        title: channel === "EMAIL" ? title || null : null,
        body,
      })
      setDirty(false)
      toast("Plantilla guardada", "success")
    } catch {
      toast("Error al guardar plantilla", "error")
    }
  }

  const handleTestWhatsapp = async () => {
    if (!previewPersonId || !previewDebtId) return
    try {
      await whatsapp.mutateAsync({
        personId: previewPersonId,
        debtId: previewDebtId,
        tone: TONE_TO_WHATSAPP[tone],
      })
      toast("WhatsApp abierto", "success")
    } catch {
      toast("Error al abrir WhatsApp", "error")
    }
  }

  // Reset debt when person changes
  const handlePersonChange = (personId: string) => {
    setPreviewPersonId(personId)
    setPreviewDebtId(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Editor Column */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Tono</Label>
          <Select
            value={tone}
            onValueChange={(v) => setTone(v as ReminderTone)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {channel === "EMAIL" && (
          <div className="space-y-2">
            <Label>Asunto</Label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setDirty(true)
              }}
              placeholder="Asunto del correo..."
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Cuerpo del mensaje</Label>
          <Textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value)
              setDirty(true)
            }}
            placeholder="Escribe tu plantilla aquí..."
            rows={6}
          />
        </div>

        <VariableChips />

        <Button
          onClick={handleSave}
          disabled={!body.trim() || !dirty || upsert.isPending}
          className="gap-2"
        >
          {upsert.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar
        </Button>
      </div>

      {/* Preview Column */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Vista previa</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Persona</Label>
                <Select
                  value={previewPersonId ?? ""}
                  onValueChange={handlePersonChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(persons ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Deuda</Label>
                <Select
                  value={previewDebtId ?? ""}
                  onValueChange={setPreviewDebtId}
                  disabled={!previewPersonId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(debts ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title ?? "Sin título"} ({formatCurrency(d.balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {channel === "EMAIL" && title && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Asunto:</p>
                <p className="text-sm font-medium">
                  {renderPreview(title, selectedDebt)}
                </p>
              </div>
            )}

            {selectedDebt ? (
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="whitespace-pre-wrap text-sm">{previewText}</p>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-lg border border-dashed py-8">
                <p className="text-sm text-muted-foreground">
                  Selecciona una persona y deuda para previsualizar.
                </p>
              </div>
            )}

            {channel === "WHATSAPP" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={
                  !previewPersonId ||
                  !previewDebtId ||
                  whatsapp.isPending
                }
                onClick={handleTestWhatsapp}
              >
                {whatsapp.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Probar WhatsApp
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const EMAIL_TYPES: { value: EmailPreviewType; label: string }[] = [
  { value: "DAILY", label: "Diario" },
  { value: "WEEKLY", label: "Semanal" },
]

const DIRECTIONS: { value: DebtDirection; label: string }[] = [
  { value: "RECEIVABLE", label: "Por Cobrar" },
  { value: "PAYABLE", label: "Por Pagar" },
]

function EmailTestSection() {
  const { toast } = useToast()
  const { data: currentUser } = useCurrentUser()
  const sendTest = useSendTestEmail()

  const [emailType, setEmailType] = useState<EmailPreviewType>("DAILY")
  const [direction, setDirection] = useState<DebtDirection | undefined>(
    undefined
  )
  const [toEmail, setToEmail] = useState("")

  // Prefill email from current user
  const [prefilled, setPrefilled] = useState(false)
  if (currentUser?.email && !prefilled) {
    setPrefilled(true)
    setToEmail(currentUser.email)
  }

  const { data: preview, isLoading: previewLoading } = useEmailPreview({
    type: emailType,
    direction,
  })

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)

  const handleSend = async () => {
    try {
      await sendTest.mutateAsync({
        toEmail,
        type: emailType,
        direction,
      })
      toast("Email de prueba enviado", "success")
    } catch {
      toast("Error al enviar email de prueba", "error")
    }
  }

  return (
    <div className="space-y-4">
      <Separator />

      <div>
        <h3 className="text-base font-semibold">Prueba de Email</h3>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <Info className="h-3 w-3" />
          En desarrollo: el backend puede registrar el envío en consola si no
          hay SMTP configurado.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Controls */}
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select
                value={emailType}
                onValueChange={(v) => setEmailType(v as EmailPreviewType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Dirección</Label>
              <Select
                value={direction ?? "ALL"}
                onValueChange={(v) =>
                  setDirection(v === "ALL" ? undefined : (v as DebtDirection))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {DIRECTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Enviar a</Label>
            <Input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={!isValidEmail || sendTest.isPending || previewLoading}
            className="gap-2"
          >
            {sendTest.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar prueba
          </Button>
        </div>

        {/* Preview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Vista previa</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {previewLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : preview ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Asunto:</p>
                  <p className="text-sm font-medium">{preview.subject}</p>
                </div>
                {preview.html ? (
                  <div
                    className="rounded-lg border bg-white p-4 text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: preview.html }}
                  />
                ) : (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {preview.text}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-lg border border-dashed py-8">
                <p className="text-sm text-muted-foreground">
                  No hay datos para previsualizar.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PlantillasPage() {
  const [activeChannel, setActiveChannel] = useState<ReminderChannel>("WHATSAPP")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Plantillas</h2>
        <p className="text-muted-foreground">
          Personaliza mensajes por tono y canal.
        </p>
      </div>

      <Tabs
        value={activeChannel}
        onValueChange={(v) => setActiveChannel(v as ReminderChannel)}
      >
        <TabsList className="grid w-full max-w-md grid-cols-3">
          {CHANNELS.map((ch) => {
            const Icon = ch.icon
            return (
              <TabsTrigger key={ch.value} value={ch.value} className="gap-2">
                <Icon className="h-4 w-4" />
                {ch.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {CHANNELS.map((ch) => (
          <TabsContent key={ch.value} value={ch.value}>
            <ChannelEditor channel={ch.value} />
            {ch.value === "EMAIL" && <EmailTestSection />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

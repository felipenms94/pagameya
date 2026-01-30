"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/toast"
import { usePersons } from "@/hooks"
import { getWorkspaceId } from "@/lib/apiClient"
import { Loader2, Download } from "lucide-react"

async function downloadWithAuth(
  endpoint: string,
  filename: string,
  params: Record<string, string> = {}
) {
  const workspaceId = getWorkspaceId()

  if (!workspaceId) {
    window.location.href = "/select-workspace"
    throw new Error("Selecciona un workspace")
  }

  const url = new URL(`/api${endpoint}`, window.location.origin)
  url.searchParams.append("workspaceId", workspaceId)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value)
  })

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = "/login"
      throw new Error("Debes iniciar sesion")
    }
    let message = "Error al descargar"
    try {
      const json = await response.json()
      message = json?.error?.message ?? message
    } catch {
      // ignore json parse errors
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const blobUrl = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}

function formatExportDate(date: Date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function sanitizeFilename(value: string) {
  return value.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "")
}

export default function ExportarPage() {
  const { toast } = useToast()
  const { data: persons = [], isLoading: personsLoading } = usePersons()
  const [personId, setPersonId] = useState<string | null>(null)
  const today = formatExportDate()
  const selectedPerson = persons.find((person) => person.id === personId)

  const [isDebtsLoading, setIsDebtsLoading] = useState(false)
  const [isPersonsLoading, setIsPersonsLoading] = useState(false)
  const [isPdfLoading, setIsPdfLoading] = useState(false)
  const [isBackupLoading, setIsBackupLoading] = useState(false)

  const handleDownload = async (runner: () => Promise<void>, success: string) => {
    try {
      await runner()
      toast(success, "success")
    } catch (error) {
      toast(error instanceof Error ? error.message : "Error al descargar", "error")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Exportar</h2>
        <p className="text-muted-foreground">
          Descarga tus datos en Excel, PDF o JSON.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Excel</CardTitle>
          <CardDescription>Exporta listas completas en XLSX.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            disabled={isDebtsLoading}
            onClick={async () => {
              setIsDebtsLoading(true)
              await handleDownload(
                () =>
                  downloadWithAuth(
                    "/export/debts.xlsx",
                    `PagameYA_deudas_${today}.xlsx`
                  ),
                "Exportacion de deudas lista"
              )
              setIsDebtsLoading(false)
            }}
          >
            {isDebtsLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar deudas
          </Button>
          <Button
            variant="outline"
            disabled={isPersonsLoading}
            onClick={async () => {
              setIsPersonsLoading(true)
              await handleDownload(
                () =>
                  downloadWithAuth(
                    "/export/persons.xlsx",
                    `PagameYA_personas_${today}.xlsx`
                  ),
                "Exportacion de personas lista"
              )
              setIsPersonsLoading(false)
            }}
          >
            {isPersonsLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar personas
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PDF</CardTitle>
          <CardDescription>Estado de cuenta por persona.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {personsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : persons.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay personas registradas para generar el PDF.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label>Persona</Label>
                <Select value={personId ?? ""} onValueChange={(value) => setPersonId(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una persona" />
                  </SelectTrigger>
                  <SelectContent>
                    {persons.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                disabled={!personId || isPdfLoading}
                onClick={async () => {
                  if (!personId) return
                  setIsPdfLoading(true)
                  const personName = selectedPerson?.name
                    ? sanitizeFilename(selectedPerson.name)
                    : "Persona"
                  await handleDownload(
                    () =>
                      downloadWithAuth(
                        `/persons/${personId}/statement.pdf`,
                        `EstadoCuenta_${personName}_${today}.pdf`
                      ),
                    "PDF descargado"
                  )
                  setIsPdfLoading(false)
                }}
              >
                {isPdfLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Descargar estado
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup</CardTitle>
          <CardDescription>Exporta todo el workspace en JSON.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled={isBackupLoading}
            onClick={async () => {
              setIsBackupLoading(true)
              await handleDownload(
                () =>
                  downloadWithAuth(
                    "/export/backup.json",
                    `PagameYA_backup_${today}.json`
                  ),
                "Backup descargado"
              )
              setIsBackupLoading(false)
            }}
          >
            {isBackupLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Descargar backup
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

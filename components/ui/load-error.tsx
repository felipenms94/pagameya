"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ApiError } from "@/lib/apiClient"

type LoadErrorProps = {
  error: Error | null
  onRetry?: () => void
  title?: string
  className?: string
}

export function LoadError({
  error,
  onRetry,
  title = "No se pudo cargar",
  className,
}: LoadErrorProps) {
  if (!error) return null

  const isApiError = error instanceof ApiError
  const requestId = isApiError ? error.requestId : undefined
  const errorCode = isApiError ? error.code : undefined

  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive/70 mb-4" />
        <p className="text-lg font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          {error.message}
        </p>
        {(requestId || errorCode) && (
          <p className="text-xs text-muted-foreground/70 mt-2 font-mono">
            {errorCode && <span>Codigo: {errorCode}</span>}
            {errorCode && requestId && <span> · </span>}
            {requestId && <span>Request: {requestId}</span>}
          </p>
        )}
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-4 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

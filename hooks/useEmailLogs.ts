"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/apiClient"
import type {
  EmailLogsResponse,
  OutboundMessageType,
  OutboundMessageDirection,
  OutboundMessageStatus,
} from "@/lib/types"

export type EmailLogsFilters = {
  type?: OutboundMessageType
  status?: OutboundMessageStatus
  direction?: OutboundMessageDirection
  q?: string
  limit?: number
  cursor?: string
}

export function useEmailLogs(filters: EmailLogsFilters = {}) {
  const { type, status, direction, q, limit = 20, cursor } = filters

  return useQuery({
    queryKey: ["email-logs", { type, status, direction, q, limit, cursor }],
    queryFn: () => {
      const params: Record<string, string | number> = { limit }
      if (type) params.type = type
      if (status) params.status = status
      if (direction) params.direction = direction
      if (q) params.q = q
      if (cursor) params.cursor = cursor
      return api.get<EmailLogsResponse>("/email/logs", { params })
    },
    staleTime: 30_000,
  })
}

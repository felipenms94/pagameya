"use client"

import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/apiClient"
import { getWorkspaceId } from "@/lib/apiClient"
import type { AlertKind } from "@/lib/types"

type LogReminderParams = {
  debtId: string
  personId: string
  channel: "WHATSAPP" | "EMAIL" | "SMS"
  tone?: "soft" | "normal" | "strong"
  kind?: AlertKind
}

export function useLogReminder() {
  return useMutation({
    mutationFn: (params: LogReminderParams) => {
      const workspaceId = getWorkspaceId()
      return api.post<{ logged: true }>("/reminders/log", {
        ...params,
        workspaceId,
      })
    },
  })
}

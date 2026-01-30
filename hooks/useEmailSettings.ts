"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getWorkspaceId } from "@/lib/apiClient"
import type {
  EmailSettingsDTO,
  EmailRunNowType,
  EmailRunNowResult,
} from "@/lib/types"

export function useEmailSettings() {
  return useQuery({
    queryKey: ["email-settings"],
    queryFn: () => api.get<EmailSettingsDTO>("/email/settings"),
    enabled: !!getWorkspaceId(),
  })
}

export type UpdateEmailSettingsInput = Omit<
  EmailSettingsDTO,
  "workspaceId" | "nextRunDailyAt" | "nextRunWeeklyAt"
>

export function useUpdateEmailSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateEmailSettingsInput) => {
      return api.put<EmailSettingsDTO>("/email/settings", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-settings"] })
    },
  })
}

export function useRunEmailNow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (type: EmailRunNowType) => {
      return api.post<EmailRunNowResult>("/email/run-now", { type })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-logs"] })
      queryClient.invalidateQueries({ queryKey: ["email-settings"] })
    },
  })
}

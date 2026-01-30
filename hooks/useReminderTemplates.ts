"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getWorkspaceId } from "@/lib/apiClient"
import type {
  ReminderChannel,
  ReminderTone,
  ReminderTemplateDTO,
} from "@/lib/types"

export function useReminderTemplates(channel?: ReminderChannel) {
  return useQuery({
    queryKey: ["reminder-templates", channel ?? "ALL"],
    queryFn: () => api.get<ReminderTemplateDTO[]>("/templates/reminders"),
    select: (data) =>
      channel ? data.filter((t) => t.channel === channel) : data,
  })
}

export function useUpsertReminderTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      channel: ReminderChannel
      tone: ReminderTone
      title?: string | null
      body: string
    }) => {
      const workspaceId = getWorkspaceId()
      return api.put<ReminderTemplateDTO>("/templates/reminders", {
        ...data,
        workspaceId,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminder-templates"] })
    },
  })
}

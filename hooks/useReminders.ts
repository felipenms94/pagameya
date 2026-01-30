"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getWorkspaceId } from "@/lib/apiClient"
import type { Reminder } from "@/lib/types"

type RemindersFilter = {
  dueToday?: boolean
}

type CreateReminderInput = {
  debtId?: string | null
  channel: "WHATSAPP" | "EMAIL" | "SMS" | "IN_APP"
  scheduledFor: string
  messageText?: string | null
}

export function useReminders(filters: RemindersFilter = {}) {
  return useQuery({
    queryKey: ["reminders", filters],
    queryFn: () =>
      api.get<Reminder[]>("/reminders", {
        params: {
          dueToday: filters.dueToday ? "true" : undefined,
        },
      }),
  })
}

export function useCreateReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateReminderInput) => {
      const workspaceId = getWorkspaceId()
      return api.post<Reminder>("/reminders", {
        workspaceId,
        debtId: input.debtId ?? null,
        channel: input.channel,
        scheduledFor: input.scheduledFor,
        messageText: input.messageText ?? null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] })
      queryClient.invalidateQueries({ queryKey: ["today"] })
    },
  })
}

export function useMarkReminderSent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => {
      const workspaceId = getWorkspaceId()
      return api.patch<Reminder>(`/reminders/${id}/mark-sent`, { workspaceId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] })
      queryClient.invalidateQueries({ queryKey: ["today"] })
    },
  })
}

export function useDeleteReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => {
      const workspaceId = getWorkspaceId()
      return api.delete<{ id: string }>(`/reminders/${id}`, {
        params: { workspaceId: workspaceId ?? undefined },
        includeWorkspace: false,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] })
      queryClient.invalidateQueries({ queryKey: ["today"] })
    },
  })
}

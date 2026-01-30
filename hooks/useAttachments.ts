"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getWorkspaceId } from "@/lib/apiClient"
import type { Attachment } from "@/lib/types"

type CreateAttachmentInput = {
  debtId?: string | null
  url: string
  note?: string | null
}

export function useAttachments(debtId: string | null) {
  return useQuery({
    queryKey: ["attachments", debtId],
    queryFn: () =>
      api.get<Attachment[]>("/attachments", {
        params: {
          debtId: debtId ?? undefined,
        },
      }),
    enabled: !!debtId,
  })
}

export function useCreateAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateAttachmentInput) => {
      const workspaceId = getWorkspaceId()
      return api.post<Attachment>("/attachments", {
        workspaceId,
        debtId: input.debtId ?? null,
        url: input.url,
        note: input.note ?? null,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["attachments", variables.debtId] })
    },
  })
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: { id: string; debtId: string | null }) => {
      const workspaceId = getWorkspaceId()
      return api.delete<{ id: string }>(`/attachments/${variables.id}`, {
        params: { workspaceId: workspaceId ?? undefined },
        includeWorkspace: false,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["attachments", variables.debtId] })
    },
  })
}

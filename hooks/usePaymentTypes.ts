"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getWorkspaceId } from "@/lib/apiClient"
import type { PaymentType } from "@/lib/types"

export function useCreatePaymentType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => {
      const workspaceId = getWorkspaceId()
      return api.post<PaymentType>("/payment-types", { workspaceId, name })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-types"] })
    },
  })
}

export function useDeletePaymentType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => {
      const workspaceId = getWorkspaceId()
      return api.delete<{ id: string }>(`/payment-types/${id}`, {
        params: { workspaceId: workspaceId ?? undefined },
        includeWorkspace: false,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-types"] })
    },
  })
}

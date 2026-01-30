"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getWorkspaceId } from "@/lib/apiClient"
import type { PromiseItem } from "@/lib/types"

type CreatePromiseInput = {
  debtId: string
  promisedDate: string
  promisedAmount?: number | null
  note?: string | null
}

export function usePromises(debtId: string | null) {
  return useQuery({
    queryKey: ["promises", debtId],
    queryFn: () => api.get<PromiseItem[]>(`/debts/${debtId}/promises`),
    enabled: !!debtId,
  })
}

export function useCreatePromise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreatePromiseInput) => {
      const workspaceId = getWorkspaceId()
      return api.post<PromiseItem>(`/debts/${input.debtId}/promises`, {
        workspaceId,
        promisedDate: input.promisedDate,
        promisedAmount: input.promisedAmount ?? null,
        note: input.note ?? null,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["promises", variables.debtId] })
      queryClient.invalidateQueries({ queryKey: ["debt", variables.debtId] })
      queryClient.invalidateQueries({ queryKey: ["today"] })
    },
  })
}

export function useDeletePromise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: { promiseId: string; debtId: string }) => {
      const workspaceId = getWorkspaceId()
      return api.delete<{ id: string }>(`/promises/${variables.promiseId}`, {
        params: { workspaceId: workspaceId ?? undefined },
        includeWorkspace: false,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["promises", variables.debtId] })
      queryClient.invalidateQueries({ queryKey: ["debt", variables.debtId] })
      queryClient.invalidateQueries({ queryKey: ["today"] })
    },
  })
}

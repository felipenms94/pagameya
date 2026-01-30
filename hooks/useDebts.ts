"use client"

import { useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getWorkspaceId } from "@/lib/apiClient"
import type { DebtDTO, DebtDetail, DebtFormData, DebtsFilter } from "@/lib/types"

export function useDebts(filters: DebtsFilter = {}) {
  return useQuery({
    queryKey: ["debts", filters],
    queryFn: () =>
      api.get<DebtDTO[]>("/debts", {
        params: {
          direction: filters.direction,
          status: filters.status,
          overdue: filters.overdue ? "true" : undefined,
          personId: filters.personId,
        },
      }),
  })
}

export function useDebt(id: string | null) {
  const queryClient = useQueryClient()

  // Remove ALL debt cache and refetch when ID changes
  useEffect(() => {
    if (id) {
      // Remove all cached debt queries to force fresh fetch
      queryClient.removeQueries({ queryKey: ["debt"] })
    }
  }, [id, queryClient])

  const query = useQuery({
    queryKey: ["debt", id],
    queryFn: async () => {
      console.log("[useDebt] Fetching debt with ID:", id)
      const result = await api.get<DebtDetail>(`/debts/${id}`)
      console.log("[useDebt] Received debt:", result.id, result.title)
      return result
    },
    enabled: !!id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  })

  return query
}

export function useCreateDebt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: DebtFormData) => {
      const workspaceId = getWorkspaceId()
      return api.post<DebtDTO>("/debts", { ...data, workspaceId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["today"] })
    },
  })
}

export function useUpdateDebt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DebtFormData> }) => {
      const workspaceId = getWorkspaceId()
      return api.patch<DebtDTO>(`/debts/${id}`, { ...data, workspaceId })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["debts"] })
      queryClient.invalidateQueries({ queryKey: ["debt", variables.id] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["today"] })
    },
  })
}

export function useDeleteDebt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/debts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["today"] })
    },
  })
}

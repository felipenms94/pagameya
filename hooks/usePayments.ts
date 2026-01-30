"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getWorkspaceId } from "@/lib/apiClient"
import type { PaymentType, DebtDetail } from "@/lib/types"

type CreatePaymentInput = {
  debtId: string
  amount: number
  paymentTypeId?: string | null
  note?: string | null
  paidAt?: string | null
}

export function usePaymentTypes() {
  return useQuery({
    queryKey: ["payment-types"],
    queryFn: () => api.get<PaymentType[]>("/payment-types"),
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreatePaymentInput) => {
      const workspaceId = getWorkspaceId()
      return api.post<DebtDetail>(`/debts/${input.debtId}/payments`, {
        workspaceId,
        amount: input.amount,
        paymentTypeId: input.paymentTypeId ?? null,
        note: input.note ?? null,
        paidAt: input.paidAt ?? null,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["debt", variables.debtId] })
      queryClient.invalidateQueries({ queryKey: ["debts"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["today"] })
    },
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: { paymentId: string; debtId: string }) => {
      const workspaceId = getWorkspaceId()
      return api.delete<{ id: string }>(`/payments/${variables.paymentId}`, {
        params: { workspaceId: workspaceId ?? undefined },
        includeWorkspace: false,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["debt", variables.debtId] })
      queryClient.invalidateQueries({ queryKey: ["debts"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["today"] })
    },
  })
}

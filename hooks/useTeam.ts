"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/apiClient"

export const MEMBER_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const
export type MemberRole = (typeof MEMBER_ROLES)[number]

export type Invitation = {
  id: string
  email: string
  role: string
  status: string
  createdAt: string
  expiresAt?: string
}

export type PendingInvitation = {
  id: string
  workspaceName: string
  invitedBy: string
  role: string
  createdAt: string
}

export function useInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: () => api.get<Invitation[]>("/invitations"),
  })
}

export function useCreateInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      api.post<Invitation>("/invitations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] })
      queryClient.invalidateQueries({ queryKey: ["members"] })
    },
  })
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ id: string }>(`/invitations/${id}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] })
    },
  })
}

export function usePendingInvitations() {
  return useQuery({
    queryKey: ["pending-invitations"],
    queryFn: () =>
      api.get<PendingInvitation[]>("/invitations/pending", {
        includeWorkspace: false,
      }),
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: string) =>
      api.post("/invitations/accept", { invitationId }, { includeWorkspace: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] })
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}

"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getWorkspaceId } from "@/lib/apiClient"
import type { MemberRole } from "./useTeam"

export type MemberDTO = {
  userId: string
  email: string
  name: string | null
  role: MemberRole
  joinedAt: string
}

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: () => api.get<MemberDTO[]>("/members"),
  })
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "ADMIN" | "MEMBER" }) => {
      const workspaceId = getWorkspaceId()
      return api.patch<MemberDTO>(`/members/${userId}`, { role }, {
        params: { workspaceId: workspaceId ?? undefined },
        includeWorkspace: false,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => {
      const workspaceId = getWorkspaceId()
      return api.delete<{ removedUserId: string }>(`/members/${userId}`, {
        params: { workspaceId: workspaceId ?? undefined },
        includeWorkspace: false,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}

type CurrentUser = {
  id: string
  email: string
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { cache: "no-store" })
      const json = await res.json()
      if (!json.ok) return null
      return json.data.user as CurrentUser
    },
    staleTime: Infinity,
  })
}

type Workspace = {
  id: string
  name: string
  mode: "BUSINESS" | "PERSONAL"
  createdAt: string
  role: string
}

export function useCurrentWorkspaceRole() {
  const workspaceId = getWorkspaceId()

  return useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api.get<Workspace[]>("/workspaces", { includeWorkspace: false }),
    select: (workspaces) => {
      const ws = workspaces.find((w) => w.id === workspaceId)
      return ws?.role ?? null
    },
  })
}

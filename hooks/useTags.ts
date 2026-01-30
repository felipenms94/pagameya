"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getWorkspaceId } from "@/lib/apiClient"
import type { Tag, TagFormData, Person } from "@/lib/types"

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<Tag[]>("/tags"),
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TagFormData) => {
      const workspaceId = getWorkspaceId()
      return api.post<Tag>("/tags", { ...data, workspaceId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] })
      queryClient.invalidateQueries({ queryKey: ["persons"] })
    },
  })
}

export function useAssignTagToPerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ personId, tagId }: { personId: string; tagId: string }) => {
      const workspaceId = getWorkspaceId()
      return api.post<Person>(`/persons/${personId}/tags`, { workspaceId, tagId })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["person", variables.personId] })
      queryClient.invalidateQueries({ queryKey: ["persons"] })
    },
  })
}

export function useRemoveTagFromPerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ personId, tagId }: { personId: string; tagId: string }) =>
      api.delete<Person>(`/persons/${personId}/tags/${tagId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["person", variables.personId] })
      queryClient.invalidateQueries({ queryKey: ["persons"] })
    },
  })
}

"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api, getWorkspaceId } from "@/lib/apiClient"
import type { Person, PersonFormData, PersonsFilter } from "@/lib/types"

export function usePersons(filters: PersonsFilter = {}) {
  return useQuery({
    queryKey: ["persons", filters],
    queryFn: () =>
      api.get<Person[]>("/persons", {
        params: {
          search: filters.search || undefined,
          priority: filters.priority || undefined,
          tag: filters.tagId || undefined,
        },
      }),
  })
}

export function usePerson(id: string | null) {
  return useQuery({
    queryKey: ["person", id],
    queryFn: () => api.get<Person>(`/persons/${id}`),
    enabled: !!id,
  })
}

export function useCreatePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: PersonFormData) => {
      const workspaceId = getWorkspaceId()
      return api.post<Person>("/persons", { ...data, workspaceId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] })
    },
  })
}

export function useUpdatePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PersonFormData> }) => {
      const workspaceId = getWorkspaceId()
      return api.patch<Person>(`/persons/${id}`, { ...data, workspaceId })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["persons"] })
      queryClient.invalidateQueries({ queryKey: ["person", variables.id] })
    },
  })
}

export function useDeletePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/persons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["persons"] })
    },
  })
}

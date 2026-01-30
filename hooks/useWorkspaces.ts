import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/apiClient"

export type WorkspaceMode = "BUSINESS" | "PERSONAL"

export type Workspace = {
  id: string
  name: string
  mode: WorkspaceMode
  createdAt: string
  role: string
}

type CreateWorkspaceInput = {
  name: string
  mode: WorkspaceMode
}

export function useWorkspaces(enabled = true) {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api.get<Workspace[]>("/workspaces", { includeWorkspace: false }),
    enabled,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) =>
      api.post<Workspace>("/workspaces", input, { includeWorkspace: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}

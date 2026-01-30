"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/apiClient"
import type { ActivityItem } from "@/lib/types"

export function useActivity() {
  return useQuery({
    queryKey: ["activity"],
    queryFn: () => api.get<ActivityItem[]>("/activity"),
  })
}

"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/apiClient"
import type { DebtDirection, TodayItem } from "@/lib/types"

export function useToday(direction: DebtDirection) {
  return useQuery({
    queryKey: ["today", direction],
    queryFn: () =>
      api.get<TodayItem[]>("/today", {
        params: { direction },
      }),
  })
}

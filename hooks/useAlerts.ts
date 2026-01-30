"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/apiClient"
import type { AlertsData, DebtDirection } from "@/lib/types"

export function useAlerts(direction?: DebtDirection) {
  return useQuery({
    queryKey: ["alerts", direction ?? "ALL"],
    queryFn: () =>
      api.get<AlertsData>("/alerts", {
        params: direction ? { direction } : undefined,
      }),
    staleTime: 60_000,
  })
}

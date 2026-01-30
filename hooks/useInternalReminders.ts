"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/apiClient"
import type { DebtDirection, InternalRemindersData } from "@/lib/types"

export function useInternalReminders(direction?: DebtDirection) {
  return useQuery({
    queryKey: ["internal-reminders", direction ?? "ALL"],
    queryFn: () =>
      api.get<InternalRemindersData>("/reminders/internal", {
        params: direction ? { direction } : undefined,
      }),
    staleTime: 60_000,
  })
}

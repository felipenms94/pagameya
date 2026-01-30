"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/apiClient"
import type { DebtDirection, SuggestedRemindersData } from "@/lib/types"

export function useSuggestedReminders(direction?: DebtDirection) {
  return useQuery({
    queryKey: ["suggested-reminders", direction ?? "ALL"],
    queryFn: () =>
      api.get<SuggestedRemindersData>("/reminders/suggested", {
        params: direction ? { direction } : undefined,
      }),
    staleTime: 60_000,
  })
}

"use client"

import { useQuery, useMutation } from "@tanstack/react-query"
import { api, getWorkspaceId } from "@/lib/apiClient"
import type {
  EmailPreviewType,
  EmailPreviewData,
  DebtDirection,
} from "@/lib/types"

export function useEmailPreview(params: {
  type: EmailPreviewType
  direction?: DebtDirection
}) {
  const { type, direction } = params

  return useQuery({
    queryKey: ["email-preview", type, direction ?? "ALL"],
    queryFn: () =>
      api.get<EmailPreviewData>("/email/preview", {
        params: {
          type,
          ...(direction ? { direction } : {}),
        },
      }),
    enabled: !!getWorkspaceId(),
  })
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: (data: {
      toEmail: string
      type: EmailPreviewType
      direction?: DebtDirection
    }) => {
      const workspaceId = getWorkspaceId()
      return api.post("/email/send-test", {
        ...data,
        workspaceId,
      })
    },
  })
}

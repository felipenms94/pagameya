"use client"

import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/apiClient"
import type { WhatsappLinkData, WhatsappTone } from "@/lib/types"

type WhatsappLinkParams = {
  personId: string
  debtId: string
  tone: WhatsappTone
}

export function useWhatsappLink() {
  return useMutation({
    mutationFn: async ({ personId, debtId, tone }: WhatsappLinkParams) => {
      const data = await api.get<WhatsappLinkData>("/whatsapp/link", {
        params: { personId, debtId, tone },
      })
      // Open WhatsApp in new tab
      window.open(data.url, "_blank")
      return data
    },
  })
}

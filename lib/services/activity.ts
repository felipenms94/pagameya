import { ActivityType } from "@prisma/client"

import { prisma } from "@/lib/prisma"

type ActivityInput = {
  workspaceId: string
  userId?: string | null
  type: ActivityType
  message?: string | null
  personId?: string | null
  debtId?: string | null
  paymentId?: string | null
}

export async function logActivity(input: ActivityInput) {
  const { workspaceId, userId, type, message, personId, debtId, paymentId } =
    input

  return prisma.activityLog.create({
    data: {
      workspaceId,
      userId: userId ?? undefined,
      type,
      message: message ?? undefined,
      personId: personId ?? undefined,
      debtId: debtId ?? undefined,
      paymentId: paymentId ?? undefined,
    },
  })
}

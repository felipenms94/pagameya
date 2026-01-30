import { DebtDirection } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { getAlertsData, AlertKind } from "@/lib/services/alerts"

type RecommendedTone = "soft" | "normal" | "strong"

type SuggestedAction = "WHATSAPP" | "CALL" | "FOLLOW_UP"

const querySchema = z.object({
  workspaceId: z.string().min(1),
  direction: z.nativeEnum(DebtDirection).optional(),
})

const toneByKind: Record<AlertKind, RecommendedTone> = {
  OVERDUE: "strong",
  DUE_TODAY: "normal",
  PROMISE_TODAY: "normal",
  DUE_SOON: "soft",
  HIGH_PRIORITY: "normal",
}

function suggestedActionForPhone(phone: string | null): SuggestedAction {
  return phone ? "WHATSAPP" : "CALL"
}

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    workspaceId: searchParams.get("workspaceId")?.trim(),
    direction: searchParams.get("direction")?.trim(),
  })

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "workspaceId is required",
      400,
      parsed.error
    )
  }

  const workspaceId = parsed.data.workspaceId
  const directionFilter = parsed.data.direction

  await requireWorkspaceMember(prisma, user.id, workspaceId)

  const alerts = await getAlertsData(prisma, workspaceId, directionFilter)

  const items = alerts.items.map((item) => ({
    kind: item.kind,
    direction: item.direction,
    debtId: item.debtId,
    personId: item.personId,
    personName: item.personName,
    personPhone: item.personPhone,
    debtTitle: item.debtTitle,
    dueDate: item.dueDate,
    promisedDate: item.promisedDate,
    balance: item.balance,
    priority: item.priority,
    recommendedTone: toneByKind[item.kind],
    suggestedAction: suggestedActionForPhone(item.personPhone),
  }))

  return NextResponse.json(
    ok({
      workspaceId: alerts.workspaceId,
      asOfLocalDate: alerts.asOfLocalDate,
      summary: alerts.summary,
      items,
    })
  )
})
import { NextResponse } from "next/server"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")?.trim()
  const personId = searchParams.get("personId")?.trim()
  const debtId = searchParams.get("debtId")?.trim()

  if (!workspaceId) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "workspaceId is required",
      400
    )
  }

  await requireWorkspaceMember(prisma, userId, workspaceId)

  const activities = await prisma.activityLog.findMany({
    where: {
      workspaceId,
      ...(personId ? { personId } : {}),
      ...(debtId ? { debtId } : {}),
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(
    ok(
      activities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        message: activity.message,
        createdAt: activity.createdAt,
        personId: activity.personId,
        debtId: activity.debtId,
        paymentId: activity.paymentId,
      }))
    )
  )
})

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

  if (!workspaceId) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "workspaceId is required",
      400
    )
  }

  await requireWorkspaceMember(prisma, userId, workspaceId)

  const [persons, tags, debts, payments, promises, reminders, activity] =
    await Promise.all([
      prisma.person.findMany({
        where: { workspaceId, deletedAt: null },
      }),
      prisma.tag.findMany({
        where: { workspaceId, deletedAt: null },
      }),
      prisma.debt.findMany({
        where: { workspaceId, deletedAt: null },
      }),
      prisma.payment.findMany({
        where: { workspaceId, debt: { deletedAt: null } },
      }),
      prisma.promise.findMany({
        where: { workspaceId, debt: { deletedAt: null } },
      }),
      prisma.reminder.findMany({
        where: {
          workspaceId,
          OR: [{ debtId: null }, { debt: { deletedAt: null } }],
        },
      }),
      prisma.activityLog.findMany({
        where: { workspaceId },
      }),
    ])

  return NextResponse.json(
    ok({
      persons,
      tags,
      debts,
      payments,
      promises,
      reminders,
      activity,
    })
  )
})

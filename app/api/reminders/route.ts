import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"

const createReminderSchema = z.object({
  workspaceId: z.string().min(1),
  debtId: z.string().nullable().optional(),
  channel: z.enum(["WHATSAPP", "EMAIL", "SMS", "IN_APP"]),
  scheduledFor: z.string().datetime(),
  messageText: z.string().nullable().optional(),
})

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
}

function endOfToday() {
  const now = new Date()
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  )
}

export const POST = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id
  const body = await request.json()
  const parsed = createReminderSchema.safeParse(body)

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid request body",
      400,
      parsed.error
    )
  }

  await requireWorkspaceMember(prisma, userId, parsed.data.workspaceId)

  if (parsed.data.debtId) {
    const debt = await prisma.debt.findFirst({
      where: {
        id: parsed.data.debtId,
        workspaceId: parsed.data.workspaceId,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (!debt) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Debt not found", 404)
    }
  }

  const reminder = await prisma.reminder.create({
    data: {
      workspaceId: parsed.data.workspaceId,
      debtId: parsed.data.debtId ?? undefined,
      channel: parsed.data.channel,
      scheduledFor: new Date(parsed.data.scheduledFor),
      messageText: parsed.data.messageText ?? undefined,
    },
  })

  return NextResponse.json(ok(reminder))
})

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")?.trim()
  const dueTodayParam = searchParams.get("dueToday")?.trim()

  if (!workspaceId) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "workspaceId is required",
      400
    )
  }

  await requireWorkspaceMember(prisma, userId, workspaceId)

  let scheduledFilter = {}
  if (dueTodayParam === "true") {
    scheduledFilter = {
      scheduledFor: { gte: startOfToday(), lte: endOfToday() },
    }
  }

  const reminders = await prisma.reminder.findMany({
    where: {
      workspaceId,
      ...scheduledFilter,
    },
    orderBy: { scheduledFor: "asc" },
  })

  return NextResponse.json(ok(reminders))
})

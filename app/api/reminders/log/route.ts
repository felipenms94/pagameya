import { ReminderChannel } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/services/activity"

const alertKindSchema = z.enum([
  "OVERDUE",
  "DUE_TODAY",
  "DUE_SOON",
  "HIGH_PRIORITY",
  "PROMISE_TODAY",
])

const logSchema = z.object({
  workspaceId: z.string().min(1),
  debtId: z.string().min(1),
  personId: z.string().min(1),
  channel: z.enum([
    ReminderChannel.WHATSAPP,
    ReminderChannel.EMAIL,
    ReminderChannel.SMS,
  ]),
  tone: z.enum(["soft", "normal", "strong"]).optional(),
  kind: alertKindSchema.optional(),
})

export const POST = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const body = await request.json()
  const parsed = logSchema.safeParse(body)

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid request body",
      400,
      parsed.error
    )
  }

  const { workspaceId, debtId, personId, channel, tone, kind } = parsed.data

  await requireWorkspaceMember(prisma, user.id, workspaceId)

  await logActivity({
    workspaceId,
    userId: user.id,
    type: "REMINDER_SENT",
    personId,
    debtId,
    message: JSON.stringify({ channel, tone, kind }),
  })

  return NextResponse.json(ok({ logged: true }))
})
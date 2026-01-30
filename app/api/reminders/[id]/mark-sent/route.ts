import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/services/activity"

const markSentSchema = z.object({
  workspaceId: z.string().min(1),
})

export const PATCH = withApiHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params
    const user = await requireUser(request)
    const userId = user.id
    const body = await request.json()
    const parsed = markSentSchema.safeParse(body)

    if (!parsed.success) {
      throw apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid request body",
        400,
        parsed.error
      )
    }

    await requireWorkspaceMember(prisma, userId, parsed.data.workspaceId)

    const reminder = await prisma.reminder.findFirst({
      where: { id, workspaceId: parsed.data.workspaceId },
    })
    if (!reminder) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Reminder not found", 404)
    }

    const updated = await prisma.reminder.update({
      where: { id: reminder.id },
      data: { sentAt: new Date() },
    })

    await logActivity({
      workspaceId: parsed.data.workspaceId,
      userId,
      type: "REMINDER_SENT",
      debtId: reminder.debtId ?? undefined,
    })

    return NextResponse.json(ok(updated))
  }
)

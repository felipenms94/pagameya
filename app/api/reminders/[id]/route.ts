import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"

const updateReminderSchema = z.object({
  workspaceId: z.string().min(1),
  scheduledFor: z.string().datetime().optional(),
  messageText: z.string().nullable().optional(),
  channel: z.enum(["WHATSAPP", "EMAIL", "SMS", "IN_APP"]).optional(),
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
    const parsed = updateReminderSchema.safeParse(body)

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
      data: {
        scheduledFor: parsed.data.scheduledFor
          ? new Date(parsed.data.scheduledFor)
          : undefined,
        messageText: parsed.data.messageText ?? undefined,
        channel: parsed.data.channel ?? undefined,
      },
    })

    return NextResponse.json(ok(updated))
  }
)

export const DELETE = withApiHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params
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

    const result = await prisma.reminder.deleteMany({
      where: { id, workspaceId },
    })

    if (result.count === 0) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Reminder not found", 404)
    }

    return NextResponse.json(ok({ id }))
  }
)

import {
  DebtDirection,
  OutboundMessageDirection,
  OutboundMessageType,
  ReminderChannel,
} from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/services/email"
import { buildDailyEmails, buildWeeklyEmail } from "@/lib/services/email-automation"

export const runtime = "nodejs"

const bodySchema = z.object({
  workspaceId: z.string().min(1),
  toEmail: z.string().email(),
  type: z.enum(["DAILY", "WEEKLY"]),
  direction: z.nativeEnum(DebtDirection).optional(),
})

export const POST = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const body = await request.json()
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid request body",
      400,
      parsed.error
    )
  }

  const { workspaceId, toEmail, type, direction } = parsed.data

  await requireWorkspaceMember(prisma, user.id, workspaceId)

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  })
  if (!workspace) {
    throw apiError(ERROR_CODES.NOT_FOUND, "Workspace not found", 404)
  }

  let subject = "Sin alertas"
  let text = ""
  let html: string | undefined

  if (type === "DAILY") {
    const emails = await buildDailyEmails(
      prisma,
      workspaceId,
      workspace.name,
      direction
    )
    const first = emails[0]
    if (first) {
      subject = first.subject
      text = first.text
      html = first.html
    }
  } else {
    const weekly = await buildWeeklyEmail(
      prisma,
      workspaceId,
      workspace.name,
      direction
    )
    if (weekly) {
      subject = weekly.subject
      text = weekly.text
      html = weekly.html
    }
  }

  const result = await sendEmail({ to: toEmail, subject, text, html })
  const sentAt = result.status === "SENT" ? new Date() : null
  const directionValue = direction
    ? OutboundMessageDirection[direction]
    : OutboundMessageDirection.ALL

  await prisma.outboundMessageLog.create({
    data: {
      workspaceId,
      channel: ReminderChannel.EMAIL,
      to: toEmail,
      subject,
      bodyText: text,
      bodyHtml: html ?? null,
      bodyPreview: text.slice(0, 200),
      status: result.status,
      type: OutboundMessageType.TEST,
      direction: directionValue,
      errorMessage: result.errorMessage ?? null,
      sentAt,
      metaJson: JSON.stringify({ type, direction }),
    },
  })

  return NextResponse.json(ok({ sent: result.status === "SENT" }))
})

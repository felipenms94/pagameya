import {
  DebtDirection,
  EmailRecipientMode,
  OutboundMessageDirection,
  OutboundMessageType,
  ReminderChannel,
} from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/services/email"
import { buildWeeklyEmail } from "@/lib/services/email-automation"

export const runtime = "nodejs"

const bodySchema = z.object({
  workspaceId: z.string().min(1).optional(),
  direction: z.nativeEnum(DebtDirection).optional(),
  toEmail: z.string().email().optional(),
})

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfIsoWeek(date: Date) {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = startOfLocalDay(date)
  start.setDate(start.getDate() + diff)
  return start
}

async function getOwnerEmails(workspaceId: string) {
  const owners = await prisma.membership.findMany({
    where: { workspaceId, role: "OWNER" },
    select: { user: { select: { email: true } } },
  })

  return owners.map((owner) => owner.user.email)
}

async function getEmailSettings(workspaceId: string) {
  const existing = await prisma.emailSettings.findUnique({
    where: { workspaceId },
  })

  if (existing) return existing

  return prisma.emailSettings.create({
    data: { workspaceId },
  })
}

async function alreadySentThisWeek(params: {
  workspaceId: string
  to: string
  direction: OutboundMessageDirection
}) {
  const start = startOfIsoWeek(new Date())
  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  const existing = await prisma.outboundMessageLog.findFirst({
    where: {
      workspaceId: params.workspaceId,
      to: params.to,
      type: OutboundMessageType.WEEKLY,
      direction: params.direction,
      status: "SENT",
      sentAt: { gte: start, lt: end },
    },
    select: { id: true },
  })

  return Boolean(existing)
}

export const POST = withApiHandler(async (request: Request) => {
  const cronSecret = request.headers.get("x-cron-secret")
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    throw apiError(ERROR_CODES.UNAUTHORIZED, "Invalid cron secret", 401)
  }

  const body = await request.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw apiError("VALIDATION_ERROR", "Invalid request body", 400, parsed.error)
  }

  const direction = parsed.data.direction
  const directionValue = direction
    ? OutboundMessageDirection[direction]
    : OutboundMessageDirection.ALL

  const workspaceIds = parsed.data.workspaceId
    ? [parsed.data.workspaceId]
    : (await prisma.workspace.findMany({ select: { id: true } })).map(
        (workspace) => workspace.id
      )

  let sent = 0
  let skipped = 0
  let failed = 0
  const reasonCounts: Record<string, number> = {}

  const bumpReason = (reason?: string | null) => {
    if (!reason) return
    reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1
  }

  for (const workspaceId of workspaceIds) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true },
    })
    if (!workspace) continue

    const settings = await getEmailSettings(workspaceId)
    if (!settings.weeklyEnabled) {
      await prisma.outboundMessageLog.create({
        data: {
          workspaceId,
          channel: ReminderChannel.EMAIL,
          to: "",
          subject: "Weekly summary",
          bodyText: "",
          bodyPreview: "",
          status: "SKIPPED",
          type: OutboundMessageType.WEEKLY,
          direction: directionValue,
          errorMessage: "DISABLED",
          metaJson: JSON.stringify({ type: "WEEKLY", direction }),
        },
      })
      skipped += 1
      bumpReason("DISABLED")
      continue
    }

    const customEmails = Array.isArray(settings.toEmails)
      ? settings.toEmails.filter(
          (email): email is string =>
            typeof email === "string" && email.trim().length > 0
        )
      : []

    const recipients = parsed.data.toEmail
      ? [parsed.data.toEmail]
      : settings.toMode === EmailRecipientMode.CUSTOM
        ? customEmails
        : await getOwnerEmails(workspaceId)

    if (recipients.length === 0) {
      await prisma.outboundMessageLog.create({
        data: {
          workspaceId,
          channel: ReminderChannel.EMAIL,
          to: "",
          subject: "Weekly summary",
          bodyText: "",
          bodyPreview: "",
          status: "SKIPPED",
          type: OutboundMessageType.WEEKLY,
          direction: directionValue,
          errorMessage: "NO_RECIPIENTS",
          metaJson: JSON.stringify({ type: "WEEKLY", direction }),
        },
      })
      skipped += 1
      bumpReason("NO_RECIPIENTS")
      continue
    }

    const weekly = await buildWeeklyEmail(prisma, workspaceId, workspace.name, direction)
    if (!weekly) {
      await prisma.outboundMessageLog.create({
        data: {
          workspaceId,
          channel: ReminderChannel.EMAIL,
          to: recipients.join(","),
          subject: "Weekly summary",
          bodyText: "",
          bodyPreview: "",
          status: "SKIPPED",
          type: OutboundMessageType.WEEKLY,
          direction: directionValue,
          errorMessage: "NO_ITEMS",
          metaJson: JSON.stringify({ type: "WEEKLY", direction }),
        },
      })
      skipped += 1
      bumpReason("NO_ITEMS")
      continue
    }

    for (const to of recipients) {
      const alreadySent = await alreadySentThisWeek({
        workspaceId,
        to,
        direction: directionValue,
      })
      if (alreadySent) {
        await prisma.outboundMessageLog.create({
          data: {
            workspaceId,
            channel: ReminderChannel.EMAIL,
            to,
            subject: weekly.subject,
            bodyText: weekly.text,
            bodyHtml: weekly.html ?? null,
            bodyPreview: weekly.text.slice(0, 200),
            status: "SKIPPED",
            type: OutboundMessageType.WEEKLY,
            direction: directionValue,
            errorMessage: "ALREADY_SENT",
            metaJson: JSON.stringify({ type: "WEEKLY", direction }),
          },
        })
        skipped += 1
        bumpReason("ALREADY_SENT")
        continue
      }

      const result = await sendEmail({
        to,
        subject: weekly.subject,
        text: weekly.text,
        html: weekly.html,
      })

      await prisma.outboundMessageLog.create({
        data: {
          workspaceId,
          channel: ReminderChannel.EMAIL,
          to,
          subject: weekly.subject,
          bodyText: weekly.text,
          bodyHtml: weekly.html ?? null,
          bodyPreview: weekly.text.slice(0, 200),
          status: result.status,
          type: OutboundMessageType.WEEKLY,
          direction: directionValue,
          errorMessage: result.errorMessage ?? null,
          sentAt: result.status === "SENT" ? new Date() : null,
          metaJson: JSON.stringify({ type: "WEEKLY", direction }),
        },
      })

      if (result.status === "SENT") {
        sent += 1
      } else if (result.status === "SKIPPED") {
        skipped += 1
        bumpReason(result.errorMessage ?? "SKIPPED")
      } else {
        failed += 1
        bumpReason(result.errorMessage ?? "FAILED")
      }
    }
  }

  return NextResponse.json(
    ok({
      processedWorkspaces: workspaceIds.length,
      sent,
      skipped,
      failed,
      reasonCounts,
    })
  )
})

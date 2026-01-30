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
import { buildDailyEmails } from "@/lib/services/email-automation"

export const runtime = "nodejs"

const bodySchema = z.object({
  workspaceId: z.string().min(1).optional(),
  direction: z.nativeEnum(DebtDirection).optional(),
  toEmail: z.string().email().optional(),
})

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
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

async function alreadySentToday(params: {
  workspaceId: string
  to: string
  direction: OutboundMessageDirection
}) {
  const start = startOfLocalDay(new Date())
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const existing = await prisma.outboundMessageLog.findFirst({
    where: {
      workspaceId: params.workspaceId,
      to: params.to,
      type: OutboundMessageType.DAILY,
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
    if (!settings.dailyEnabled) {
      await prisma.outboundMessageLog.create({
        data: {
          workspaceId,
          channel: ReminderChannel.EMAIL,
          to: "",
          subject: "Daily reminders",
          bodyText: "",
          bodyPreview: "",
          status: "SKIPPED",
          type: OutboundMessageType.DAILY,
          direction: directionValue,
          errorMessage: "DISABLED",
          metaJson: JSON.stringify({ type: "DAILY", direction }),
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
          subject: "Daily reminders",
          bodyText: "",
          bodyPreview: "",
          status: "SKIPPED",
          type: OutboundMessageType.DAILY,
          direction: directionValue,
          errorMessage: "NO_RECIPIENTS",
          metaJson: JSON.stringify({ type: "DAILY", direction }),
        },
      })
      skipped += 1
      bumpReason("NO_RECIPIENTS")
      continue
    }

    const emails = await buildDailyEmails(
      prisma,
      workspaceId,
      workspace.name,
      direction
    )
    if (emails.length === 0) {
      await prisma.outboundMessageLog.create({
        data: {
          workspaceId,
          channel: ReminderChannel.EMAIL,
          to: recipients.join(","),
          subject: "Daily reminders",
          bodyText: "",
          bodyPreview: "",
          status: "SKIPPED",
          type: OutboundMessageType.DAILY,
          direction: directionValue,
          errorMessage: "NO_ITEMS",
          metaJson: JSON.stringify({ type: "DAILY", direction }),
        },
      })
      skipped += 1
      bumpReason("NO_ITEMS")
      continue
    }

    for (const email of emails) {
      for (const to of recipients) {
        const alreadySent = await alreadySentToday({
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
              subject: email.subject,
              bodyText: email.text,
              bodyHtml: email.html ?? null,
              bodyPreview: email.text.slice(0, 200),
              status: "SKIPPED",
              type: OutboundMessageType.DAILY,
              direction: directionValue,
              errorMessage: "ALREADY_SENT",
              metaJson: JSON.stringify({ type: "DAILY", direction, personId: email.personId }),
            },
          })
          skipped += 1
          bumpReason("ALREADY_SENT")
          continue
        }

        const result = await sendEmail({
          to,
          subject: email.subject,
          text: email.text,
          html: email.html,
        })

        await prisma.outboundMessageLog.create({
          data: {
            workspaceId,
            channel: ReminderChannel.EMAIL,
            to,
            subject: email.subject,
            bodyText: email.text,
            bodyHtml: email.html ?? null,
            bodyPreview: email.text.slice(0, 200),
            status: result.status,
            type: OutboundMessageType.DAILY,
            direction: directionValue,
            errorMessage: result.errorMessage ?? null,
            sentAt: result.status === "SENT" ? new Date() : null,
            metaJson: JSON.stringify({ type: "DAILY", direction, personId: email.personId }),
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

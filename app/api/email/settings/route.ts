import { EmailRecipientMode, MemberRole } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"

const querySchema = z.object({
  workspaceId: z.string().min(1),
})

const bodySchema = z
  .object({
    workspaceId: z.string().min(1),
    dailyEnabled: z.boolean(),
    dailyHourLocal: z.number().int().min(0).max(23),
    weeklyEnabled: z.boolean(),
    weeklyDayOfWeek: z.number().int().min(1).max(7),
    weeklyHourLocal: z.number().int().min(0).max(23),
    toMode: z.nativeEnum(EmailRecipientMode),
    toEmails: z.array(z.string().email()).optional().nullable(),
    timezone: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.toMode === EmailRecipientMode.CUSTOM) {
      const emails = (data.toEmails ?? [])
        .map((email) => email.trim())
        .filter(Boolean)
      if (emails.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["toEmails"],
          message: "toEmails required when toMode is CUSTOM",
        })
      }
    }
  })

async function ensureEmailSettings(workspaceId: string) {
  const existing = await prisma.emailSettings.findUnique({
    where: { workspaceId },
  })

  if (existing) return existing

  return prisma.emailSettings.create({
    data: { workspaceId },
  })
}

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    workspaceId: searchParams.get("workspaceId")?.trim(),
  })

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "workspaceId is required",
      400,
      parsed.error
    )
  }

  const { workspaceId } = parsed.data
  const membership = await requireWorkspaceMember(prisma, user.id, workspaceId)
  if (membership.role !== MemberRole.OWNER && membership.role !== MemberRole.ADMIN) {
    throw apiError(ERROR_CODES.FORBIDDEN, "Not allowed", 403)
  }

  const settings = await ensureEmailSettings(workspaceId)

  return NextResponse.json(ok({ settings }))
})

export const PUT = withApiHandler(async (request: Request) => {
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

  const {
    workspaceId,
    dailyEnabled,
    dailyHourLocal,
    weeklyEnabled,
    weeklyDayOfWeek,
    weeklyHourLocal,
    toMode,
    toEmails,
    timezone,
  } = parsed.data

  const membership = await requireWorkspaceMember(prisma, user.id, workspaceId)
  if (membership.role !== MemberRole.OWNER && membership.role !== MemberRole.ADMIN) {
    throw apiError(ERROR_CODES.FORBIDDEN, "Not allowed", 403)
  }

  const normalizedEmails = (toEmails ?? [])
    .map((email) => email.trim())
    .filter(Boolean)
  const storedEmails =
    toMode === EmailRecipientMode.CUSTOM && normalizedEmails.length > 0
      ? normalizedEmails
      : null

  const settings = await prisma.emailSettings.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      dailyEnabled,
      dailyHourLocal,
      weeklyEnabled,
      weeklyDayOfWeek,
      weeklyHourLocal,
      toMode,
      toEmails: storedEmails,
      timezone,
    },
    update: {
      dailyEnabled,
      dailyHourLocal,
      weeklyEnabled,
      weeklyDayOfWeek,
      weeklyHourLocal,
      toMode,
      toEmails: storedEmails,
      timezone,
    },
  })

  return NextResponse.json(ok({ settings }))
})

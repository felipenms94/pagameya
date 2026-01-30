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

const toneSchema = z.enum(["soft", "normal", "strong"])
const channelSchema = z.enum(["WHATSAPP", "EMAIL", "SMS"])

const upsertSchema = z.object({
  workspaceId: z.string().min(1),
  channel: channelSchema,
  tone: toneSchema,
  title: z.string().min(1).optional().nullable(),
  body: z.string().min(1),
})

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

  const workspaceId = parsed.data.workspaceId
  await requireWorkspaceMember(prisma, user.id, workspaceId)

  const templates = await prisma.reminderTemplate.findMany({
    where: { workspaceId },
    orderBy: [{ channel: "asc" }, { tone: "asc" }],
    select: {
      id: true,
      workspaceId: true,
      channel: true,
      tone: true,
      title: true,
      body: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(ok(templates))
})

export const PUT = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const body = await request.json()
  const parsed = upsertSchema.safeParse(body)

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid request body",
      400,
      parsed.error
    )
  }

  const { workspaceId, channel, tone, title, body: templateBody } = parsed.data

  await requireWorkspaceMember(prisma, user.id, workspaceId)

  const template = await prisma.reminderTemplate.upsert({
    where: {
      workspaceId_channel_tone: {
        workspaceId,
        channel,
        tone,
      },
    },
    create: {
      workspaceId,
      channel,
      tone,
      title: title ?? null,
      body: templateBody,
    },
    update: {
      title: title ?? null,
      body: templateBody,
    },
  })

  return NextResponse.json(ok(template))
})
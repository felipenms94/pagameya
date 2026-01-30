import {
  MemberRole,
  OutboundMessageDirection,
  OutboundMessageStatus,
  OutboundMessageType,
} from "@prisma/client"
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
  type: z.nativeEnum(OutboundMessageType).optional(),
  status: z.nativeEnum(OutboundMessageStatus).optional(),
  direction: z.nativeEnum(OutboundMessageDirection).optional(),
  q: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().min(1).optional(),
})

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    workspaceId: searchParams.get("workspaceId")?.trim(),
    type: searchParams.get("type")?.trim(),
    status: searchParams.get("status")?.trim(),
    direction: searchParams.get("direction")?.trim(),
    q: searchParams.get("q")?.trim(),
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor")?.trim(),
  })

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "workspaceId is required",
      400,
      parsed.error
    )
  }

  const {
    workspaceId,
    type,
    status,
    direction,
    q,
    limit = 50,
    cursor,
  } = parsed.data

  const membership = await requireWorkspaceMember(prisma, user.id, workspaceId)
  if (membership.role !== MemberRole.OWNER && membership.role !== MemberRole.ADMIN) {
    throw apiError(ERROR_CODES.FORBIDDEN, "Not allowed", 403)
  }

  const where = {
    workspaceId,
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(direction ? { direction } : {}),
    ...(q
      ? {
          OR: [
            { to: { contains: q, mode: "insensitive" as const } },
            { subject: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const logs = await prisma.outboundMessageLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    take: limit,
    select: {
      id: true,
      workspaceId: true,
      channel: true,
      to: true,
      subject: true,
      bodyPreview: true,
      status: true,
      type: true,
      direction: true,
      errorMessage: true,
      createdAt: true,
      sentAt: true,
    },
  })

  const nextCursor = logs.length === limit ? logs[logs.length - 1].id : null

  return NextResponse.json(ok({ items: logs, nextCursor }))
})
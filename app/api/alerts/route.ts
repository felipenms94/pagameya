import { DebtDirection } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { getAlertsData } from "@/lib/services/alerts"

const querySchema = z.object({
  workspaceId: z.string().min(1),
  direction: z.nativeEnum(DebtDirection).optional(),
})

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    workspaceId: searchParams.get("workspaceId")?.trim(),
    direction: searchParams.get("direction")?.trim(),
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
  const directionFilter = parsed.data.direction

  await requireWorkspaceMember(prisma, user.id, workspaceId)

  const data = await getAlertsData(prisma, workspaceId, directionFilter)

  return NextResponse.json(ok(data))
})
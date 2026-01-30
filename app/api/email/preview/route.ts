import { DebtDirection } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { buildDailyEmails, buildWeeklyEmail } from "@/lib/services/email-automation"

export const runtime = "nodejs"

const querySchema = z.object({
  workspaceId: z.string().min(1),
  type: z.enum(["DAILY", "WEEKLY"]),
  direction: z.nativeEnum(DebtDirection).optional(),
})

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    workspaceId: searchParams.get("workspaceId")?.trim(),
    type: searchParams.get("type")?.trim(),
    direction: searchParams.get("direction")?.trim(),
  })

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "workspaceId and type are required",
      400,
      parsed.error
    )
  }

  const workspaceId = parsed.data.workspaceId
  const type = parsed.data.type
  const direction = parsed.data.direction

  await requireWorkspaceMember(prisma, user.id, workspaceId)

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  })
  if (!workspace) {
    throw apiError(ERROR_CODES.NOT_FOUND, "Workspace not found", 404)
  }

  if (type === "DAILY") {
    const emails = await buildDailyEmails(
      prisma,
      workspaceId,
      workspace.name,
      direction
    )

    const first = emails[0]
    if (!first) {
      return NextResponse.json(ok({ subject: "Sin alertas", text: "" }))
    }

    return NextResponse.json(
      ok({
        subject: first.subject,
        text: first.text,
        html: first.html ?? null,
      })
    )
  }

  const weekly = await buildWeeklyEmail(
    prisma,
    workspaceId,
    workspace.name,
    direction
  )

  if (!weekly) {
    return NextResponse.json(ok({ subject: "Sin alertas", text: "" }))
  }

  return NextResponse.json(ok(weekly))
})
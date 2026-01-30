import { NextResponse } from "next/server"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { createWorkspaceSchema } from "@/lib/validators/workspace"
import { prisma } from "@/lib/prisma"

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id

  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { workspace: true },
  })

  const data = memberships.map((membership) => ({
    id: membership.workspace.id,
    name: membership.workspace.name,
    mode: membership.workspace.mode,
    createdAt: membership.workspace.createdAt,
    role: membership.role,
  }))

  return NextResponse.json(ok(data))
})

export const POST = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id
  const body = await request.json()
  const parsed = createWorkspaceSchema.safeParse(body)

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid request body",
      400,
      parsed.error
    )
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: parsed.data.name,
      mode: parsed.data.mode,
      memberships: {
        create: { userId, role: "OWNER" },
      },
    },
  })

  return NextResponse.json(
    ok({
      id: workspace.id,
      name: workspace.name,
      mode: workspace.mode,
      createdAt: workspace.createdAt,
    })
  )
})

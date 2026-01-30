import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"

export const GET = withApiHandler(async (request: Request) => {
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

  const paymentTypes = await prisma.paymentType.findMany({
    where: { workspaceId, isActive: true },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  })

  const data = paymentTypes.map((paymentType) => ({
    id: paymentType.id,
    workspaceId: paymentType.workspaceId,
    name: paymentType.name,
    isSystem: paymentType.isSystem,
    isActive: paymentType.isActive,
    createdAt: paymentType.createdAt,
  }))

  return NextResponse.json(ok(data))
})

export const POST = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id
  const body = await request.json()

  const schema = z.object({
    workspaceId: z.string().min(1),
    name: z.string().min(1),
  })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid request body",
      400,
      parsed.error
    )
  }

  await requireWorkspaceMember(prisma, userId, parsed.data.workspaceId)

  const existing = await prisma.paymentType.findFirst({
    where: { workspaceId: parsed.data.workspaceId, name: parsed.data.name },
  })
  if (existing) {
    throw apiError(ERROR_CODES.CONFLICT, "Payment type already exists", 409)
  }

  const paymentType = await prisma.paymentType.create({
    data: {
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      isSystem: false,
      isActive: true,
    },
  })

  return NextResponse.json(
    ok({
      id: paymentType.id,
      workspaceId: paymentType.workspaceId,
      name: paymentType.name,
      isSystem: paymentType.isSystem,
      isActive: paymentType.isActive,
      createdAt: paymentType.createdAt,
    })
  )
})

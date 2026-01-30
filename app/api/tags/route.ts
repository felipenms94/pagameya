import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { createTagSchema } from "@/lib/validators/tag"

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

  const tags = await prisma.tag.findMany({
    where: { workspaceId, deletedAt: null },
    orderBy: { name: "asc" },
  })

  const data = tags.map((tag) => ({
    id: tag.id,
    workspaceId: tag.workspaceId,
    name: tag.name,
    color: tag.color,
    createdAt: tag.createdAt,
  }))

  return NextResponse.json(ok(data))
})

export const POST = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id
  const body = await request.json()
  const parsed = createTagSchema.safeParse(body)

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid request body",
      400,
      parsed.error
    )
  }

  await requireWorkspaceMember(prisma, userId, parsed.data.workspaceId)

  try {
    const tag = await prisma.tag.create({
      data: {
        workspaceId: parsed.data.workspaceId,
        name: parsed.data.name,
        color: parsed.data.color ?? undefined,
      },
    })

    return NextResponse.json(
      ok({
        id: tag.id,
        workspaceId: tag.workspaceId,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt,
      })
    )
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw apiError(ERROR_CODES.CONFLICT, "Tag already exists", 409)
    }
    throw error
  }
})

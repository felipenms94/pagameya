import { NextResponse } from "next/server"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"

export const DELETE = withApiHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params
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

    const result = await prisma.tag.updateMany({
      where: { id, workspaceId, deletedAt: null },
      data: { deletedAt: new Date() },
    })

    if (result.count === 0) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Tag not found", 404)
    }

    return NextResponse.json(ok({ id }))
  }
)

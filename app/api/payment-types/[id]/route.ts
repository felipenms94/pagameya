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

    const paymentType = await prisma.paymentType.findFirst({
      where: { id, workspaceId },
    })
    if (!paymentType) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Payment type not found", 404)
    }

    if (paymentType.isSystem) {
      throw apiError(ERROR_CODES.FORBIDDEN, "Cannot delete system payment type", 403)
    }

    await prisma.paymentType.update({
      where: { id: paymentType.id },
      data: { isActive: false },
    })

    return NextResponse.json(ok({ id: paymentType.id }))
  }
)

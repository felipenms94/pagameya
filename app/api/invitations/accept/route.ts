import { InvitationStatus } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { prisma } from "@/lib/prisma"

const acceptSchema = z.object({
  token: z.string().min(1),
})

export const POST = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id
  const userEmail = user.email.trim().toLowerCase()
  const body = await request.json()
  const parsed = acceptSchema.safeParse(body)

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid request body",
      400,
      parsed.error
    )
  }

  const token = parsed.data.token.trim()
  const now = new Date()

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    select: {
      id: true,
      workspaceId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
    },
  })

  if (!invitation) {
    throw apiError(ERROR_CODES.NOT_FOUND, "Invitation not found", 404)
  }

  if (invitation.email !== userEmail) {
    throw apiError(ERROR_CODES.FORBIDDEN, "Invitation email mismatch", 403)
  }

  if (invitation.expiresAt < now && invitation.status === InvitationStatus.PENDING) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.EXPIRED },
    })
  }

  if (invitation.status === InvitationStatus.ACCEPTED) {
    return NextResponse.json(ok({ workspaceId: invitation.workspaceId }))
  }

  if (invitation.status === InvitationStatus.REVOKED) {
    throw apiError("INVITE_REVOKED", "Invitation has been revoked", 409)
  }

  if (invitation.status === InvitationStatus.EXPIRED || invitation.expiresAt < now) {
    throw apiError("INVITE_EXPIRED", "Invitation has expired", 410)
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    throw apiError("INVITE_NOT_PENDING", "Invitation is not pending", 409)
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingMembership = await tx.membership.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId: invitation.workspaceId },
      },
      select: { id: true },
    })

    if (!existingMembership) {
      await tx.membership.create({
        data: {
          userId,
          workspaceId: invitation.workspaceId,
          role: invitation.role,
        },
      })
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: now,
        acceptedByUserId: userId,
      },
    })

    return {
      workspaceId: invitation.workspaceId,
      role: invitation.role,
    }
  })

  return NextResponse.json(ok(result))
})
import { InvitationStatus, MemberRole } from "@prisma/client"
import { NextResponse } from "next/server"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"

function canRevoke(role: MemberRole) {
  return role === MemberRole.OWNER || role === MemberRole.ADMIN
}

export const POST = withApiHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params
    const user = await requireUser(request)

    const invitation = await prisma.invitation.findUnique({
      where: { id },
      select: {
        id: true,
        workspaceId: true,
        status: true,
      },
    })

    if (!invitation) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Invitation not found", 404)
    }

    const membership = await requireWorkspaceMember(
      prisma,
      user.id,
      invitation.workspaceId
    )
    if (!canRevoke(membership.role)) {
      throw apiError(ERROR_CODES.FORBIDDEN, "Only owners can revoke", 403)
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw apiError(
        "INVITE_ALREADY_ACCEPTED",
        "Accepted invitations cannot be revoked",
        409
      )
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      return NextResponse.json(ok(invitation))
    }

    const revoked = await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.REVOKED },
      select: {
        id: true,
        workspaceId: true,
        status: true,
      },
    })

    return NextResponse.json(ok(revoked))
  }
)
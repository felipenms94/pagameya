import { NextResponse } from "next/server"
import { InvitationStatus } from "@prisma/client"

import { ok } from "@/lib/api/response"
import { withApiHandler } from "@/lib/api/handler"
import { requireUser } from "@/lib/auth/requireUser"
import { prisma } from "@/lib/prisma"

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const email = user.email.trim().toLowerCase()
  const now = new Date()

  // Expire any pending invitations for this email before listing.
  await prisma.invitation.updateMany({
    where: {
      email,
      status: InvitationStatus.PENDING,
      expiresAt: { lt: now },
    },
    data: { status: InvitationStatus.EXPIRED },
  })

  const invitations = await prisma.invitation.findMany({
    where: {
      email,
      status: InvitationStatus.PENDING,
      expiresAt: { gte: now },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      workspaceId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      workspace: { select: { id: true, name: true, mode: true } },
      invitedBy: { select: { id: true, email: true } },
    },
  })

  return NextResponse.json(ok(invitations))
})


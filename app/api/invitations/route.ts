import crypto from "crypto"
import { NextResponse } from "next/server"
import { MemberRole, InvitationStatus } from "@prisma/client"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7

const createInvitationSchema = z.object({
  workspaceId: z.string().min(1),
  email: z.string().email(),
  role: z.nativeEnum(MemberRole).optional(),
})

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex")
}

async function requireOwner(userId: string, workspaceId: string) {
  const membership = await requireWorkspaceMember(prisma, userId, workspaceId)
  if (membership.role !== MemberRole.OWNER) {
    throw apiError(ERROR_CODES.FORBIDDEN, "Only owners can invite", 403)
  }
  return membership
}

async function expirePendingInvitations(workspaceId: string) {
  const now = new Date()
  await prisma.invitation.updateMany({
    where: {
      workspaceId,
      status: InvitationStatus.PENDING,
      expiresAt: { lt: now },
    },
    data: { status: InvitationStatus.EXPIRED },
  })
}

export const POST = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id
  const body = await request.json()
  const parsed = createInvitationSchema.safeParse(body)

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid request body",
      400,
      parsed.error
    )
  }

  const workspaceId = parsed.data.workspaceId.trim()
  const email = normalizeEmail(parsed.data.email)
  const role = parsed.data.role ?? MemberRole.MEMBER

  await requireOwner(userId, workspaceId)
  await expirePendingInvitations(workspaceId)

  const invitedUser = await prisma.userAuth.findUnique({
    where: { email },
    select: { id: true },
  })
  if (invitedUser) {
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: { userId: invitedUser.id, workspaceId },
      },
      select: { id: true },
    })
    if (existingMembership) {
      throw apiError("ALREADY_MEMBER", "User already in workspace", 409)
    }
  }

  const existingInvite = await prisma.invitation.findFirst({
    where: {
      workspaceId,
      email,
      status: InvitationStatus.PENDING,
    },
    select: { id: true, expiresAt: true },
  })

  if (existingInvite && existingInvite.expiresAt >= new Date()) {
    throw apiError("INVITE_EXISTS", "Pending invitation already exists", 409)
  }

  if (existingInvite && existingInvite.expiresAt < new Date()) {
    await prisma.invitation.update({
      where: { id: existingInvite.id },
      data: { status: InvitationStatus.EXPIRED },
    })
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

  const invitation = await prisma.invitation.create({
    data: {
      workspaceId,
      email,
      role,
      token: generateToken(),
      invitedByUserId: userId,
      expiresAt,
    },
    select: {
      id: true,
      workspaceId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      token: true,
    },
  })

  return NextResponse.json(ok(invitation))
})

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

  const membership = await requireWorkspaceMember(prisma, userId, workspaceId)

  if (membership.role !== MemberRole.OWNER) {
    throw apiError(ERROR_CODES.FORBIDDEN, "Only owners can list invites", 403)
  }

  await expirePendingInvitations(workspaceId)

  const invitations = await prisma.invitation.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      workspaceId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      acceptedAt: true,
      invitedBy: { select: { id: true, email: true } },
      acceptedBy: { select: { id: true, email: true } },
    },
  })

  return NextResponse.json(ok(invitations))
})


import { MemberRole, WorkspaceMode } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"

const workspaceQuerySchema = z.object({
  workspaceId: z.string().min(1),
})

const patchRoleSchema = z.object({
  role: z.enum([MemberRole.ADMIN, MemberRole.MEMBER]),
})

function canRemoveMembers(role: MemberRole) {
  return role === MemberRole.OWNER || role === MemberRole.ADMIN
}

async function requireBusinessWorkspace(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, mode: true },
  })
  if (!workspace) {
    throw apiError(ERROR_CODES.NOT_FOUND, "Workspace not found", 404)
  }
  if (workspace.mode !== WorkspaceMode.BUSINESS) {
    throw apiError(
      "BUSINESS_ONLY",
      "Members are only available in BUSINESS workspaces",
      403
    )
  }
  return workspace
}

async function getTargetMembership(workspaceId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId },
    },
    select: {
      userId: true,
      role: true,
      createdAt: true,
      user: { select: { email: true } },
    },
  })
  if (!membership) {
    throw apiError(ERROR_CODES.NOT_FOUND, "Member not found", 404)
  }
  return membership
}

export const PATCH = withApiHandler(
  async (
    request: Request,
    context: { params: Promise<{ userId: string }> }
  ) => {
    const user = await requireUser(request)
    const { searchParams } = new URL(request.url)
    const queryParsed = workspaceQuerySchema.safeParse({
      workspaceId: searchParams.get("workspaceId")?.trim(),
    })

    if (!queryParsed.success) {
      throw apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "workspaceId is required",
        400,
        queryParsed.error
      )
    }

    const body = await request.json()
    const bodyParsed = patchRoleSchema.safeParse(body)
    if (!bodyParsed.success) {
      throw apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid request body",
        400,
        bodyParsed.error
      )
    }

    const workspaceId = queryParsed.data.workspaceId
    const { userId: targetUserId } = await context.params
    const nextRole = bodyParsed.data.role

    const requesterMembership = await requireWorkspaceMember(
      prisma,
      user.id,
      workspaceId
    )
    await requireBusinessWorkspace(workspaceId)

    if (requesterMembership.role !== MemberRole.OWNER) {
      throw apiError(
        ERROR_CODES.FORBIDDEN,
        "Only owners can change member roles",
        403
      )
    }

    if (targetUserId === user.id) {
      throw apiError(
        "CANNOT_CHANGE_OWN_ROLE",
        "Owners cannot change their own role",
        403
      )
    }

    const targetMembership = await getTargetMembership(workspaceId, targetUserId)

    if (targetMembership.role === MemberRole.OWNER) {
      throw apiError(
        "FORBIDDEN_ROLE_CHANGE",
        "Owner role changes are not allowed via this API",
        403
      )
    }

    if (nextRole === MemberRole.OWNER) {
      throw apiError(
        "FORBIDDEN_ROLE_CHANGE",
        "Promoting to OWNER is not allowed via this API",
        403
      )
    }

    if (targetMembership.role === nextRole) {
      return NextResponse.json(
        ok({
          userId: targetMembership.userId,
          email: targetMembership.user.email,
          name: null as string | null,
          role: targetMembership.role,
          joinedAt: targetMembership.createdAt,
        })
      )
    }

    const updated = await prisma.membership.update({
      where: {
        userId_workspaceId: { userId: targetUserId, workspaceId },
      },
      data: { role: nextRole },
      select: {
        userId: true,
        role: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    })

    return NextResponse.json(
      ok({
        userId: updated.userId,
        email: updated.user.email,
        name: null as string | null,
        role: updated.role,
        joinedAt: updated.createdAt,
      })
    )
  }
)

export const DELETE = withApiHandler(
  async (
    request: Request,
    context: { params: Promise<{ userId: string }> }
  ) => {
    const user = await requireUser(request)
    const { searchParams } = new URL(request.url)
    const parsed = workspaceQuerySchema.safeParse({
      workspaceId: searchParams.get("workspaceId")?.trim(),
    })

    if (!parsed.success) {
      throw apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "workspaceId is required",
        400,
        parsed.error
      )
    }

    const workspaceId = parsed.data.workspaceId
    const { userId: targetUserId } = await context.params

    const requesterMembership = await requireWorkspaceMember(
      prisma,
      user.id,
      workspaceId
    )
    await requireBusinessWorkspace(workspaceId)

    if (!canRemoveMembers(requesterMembership.role)) {
      throw apiError(
        ERROR_CODES.FORBIDDEN,
        "Only owners or admins can remove members",
        403
      )
    }

    if (targetUserId === user.id) {
      throw apiError("CANNOT_REMOVE_SELF", "Cannot remove yourself", 403)
    }

    const targetMembership = await getTargetMembership(workspaceId, targetUserId)

    if (targetMembership.role === MemberRole.OWNER) {
      throw apiError(
        ERROR_CODES.FORBIDDEN,
        "Owners cannot be removed via this API",
        403
      )
    }

    const ownerCount = await prisma.membership.count({
      where: { workspaceId, role: MemberRole.OWNER },
    })
    if (ownerCount <= 0) {
      throw apiError(
        "LAST_OWNER",
        "Workspace must have at least one owner",
        409
      )
    }

    await prisma.membership.delete({
      where: {
        userId_workspaceId: { userId: targetUserId, workspaceId },
      },
    })

    return NextResponse.json(ok({ removedUserId: targetUserId }))
  }
)
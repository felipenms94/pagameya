import { MemberRole, WorkspaceMode } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"

const listMembersSchema = z.object({
  workspaceId: z.string().min(1),
})

const roleRank: Record<MemberRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
}

function canListMembers(role: MemberRole) {
  return role === MemberRole.OWNER || role === MemberRole.ADMIN
}

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const { searchParams } = new URL(request.url)
  const parsed = listMembersSchema.safeParse({
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
  const membership = await requireWorkspaceMember(prisma, user.id, workspaceId)

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, mode: true },
  })
  if (!workspace) {
    throw apiError(ERROR_CODES.NOT_FOUND, "Workspace not found", 404)
  }

  if (workspace.mode !== WorkspaceMode.BUSINESS) {
    throw apiError("BUSINESS_ONLY", "Members are only available in BUSINESS workspaces", 403)
  }

  if (!canListMembers(membership.role)) {
    throw apiError(ERROR_CODES.FORBIDDEN, "Only owners or admins can list members", 403)
  }

  const memberships = await prisma.membership.findMany({
    where: { workspaceId },
    select: {
      userId: true,
      role: true,
      createdAt: true,
      user: { select: { email: true } },
    },
  })

  const data = memberships
    .map((item) => ({
      userId: item.userId,
      email: item.user.email,
      name: null as string | null,
      role: item.role,
      joinedAt: item.createdAt,
    }))
    .sort((a, b) => {
      const rankDiff = roleRank[b.role] - roleRank[a.role]
      if (rankDiff !== 0) return rankDiff
      const createdAtDiff = a.joinedAt.getTime() - b.joinedAt.getTime()
      if (createdAtDiff !== 0) return createdAtDiff
      return a.email.localeCompare(b.email)
    })

  return NextResponse.json(ok(data))
})
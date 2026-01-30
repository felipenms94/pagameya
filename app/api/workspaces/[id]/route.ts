import { NextResponse } from "next/server"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"

export const GET = withApiHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
  const { id } = await params
  const user = await requireUser(request)
  const userId = user.id
  const membership = await requireWorkspaceMember(prisma, userId, id)

  const workspace = await prisma.workspace.findUnique({
    where: { id },
  })

  if (!workspace) {
    throw apiError(ERROR_CODES.NOT_FOUND, "Workspace not found", 404)
  }

  return NextResponse.json(
    ok({
      id: workspace.id,
      name: workspace.name,
      mode: workspace.mode,
      createdAt: workspace.createdAt,
      role: membership.role,
    })
  )
  }
)

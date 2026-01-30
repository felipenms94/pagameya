import { NextResponse } from "next/server"

import { ERROR_CODES } from "@/lib/api/errors"
import { ok, fail } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"

type AppError = Error & { code?: string; details?: unknown }

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireUser(request)
    const userId = user.id
    const membership = await requireWorkspaceMember(
      prisma,
      userId,
      id
    )

    const workspace = await prisma.workspace.findUnique({
      where: { id },
    })

    if (!workspace) {
      return NextResponse.json(
        fail(ERROR_CODES.NOT_FOUND, "Workspace not found"),
        { status: 404 }
      )
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
  } catch (error) {
    const { body, status } = toErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

function toErrorResponse(error: unknown) {
  const appError = error as AppError
  if (appError?.code === ERROR_CODES.UNAUTHORIZED) {
    return { body: fail(ERROR_CODES.UNAUTHORIZED, appError.message), status: 401 }
  }
  if (appError?.code === ERROR_CODES.FORBIDDEN) {
    return { body: fail(ERROR_CODES.FORBIDDEN, appError.message), status: 403 }
  }
  if (appError?.code === ERROR_CODES.VALIDATION_ERROR) {
    return {
      body: fail(ERROR_CODES.VALIDATION_ERROR, appError.message, appError.details),
      status: 400,
    }
  }

  return {
    body: fail(ERROR_CODES.INTERNAL_ERROR, "Unexpected error"),
    status: 500,
  }
}

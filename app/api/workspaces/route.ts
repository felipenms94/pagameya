import { NextResponse } from "next/server"

import { ERROR_CODES } from "@/lib/api/errors"
import { ok, fail } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { createWorkspaceSchema } from "@/lib/validators/workspace"
import { prisma } from "@/lib/prisma"

type AppError = Error & { code?: string; details?: unknown }

export async function GET(request: Request) {
  try {
    const user = await requireUser(request)
    const userId = user.id

    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: { workspace: true },
    })

    const data = memberships.map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      mode: membership.workspace.mode,
      createdAt: membership.workspace.createdAt,
      role: membership.role,
    }))

    return NextResponse.json(ok(data))
  } catch (error) {
    const { body, status } = toErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request)
    const userId = user.id
    const body = await request.json()
    const parsed = createWorkspaceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        fail(ERROR_CODES.VALIDATION_ERROR, "Invalid request body", parsed.error),
        { status: 400 }
      )
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: parsed.data.name,
        mode: parsed.data.mode,
        memberships: {
          create: { userId, role: "OWNER" },
        },
      },
    })

    return NextResponse.json(
      ok({
        id: workspace.id,
        name: workspace.name,
        mode: workspace.mode,
        createdAt: workspace.createdAt,
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

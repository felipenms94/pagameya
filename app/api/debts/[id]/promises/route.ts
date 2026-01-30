import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/services/activity"

const createPromiseSchema = z.object({
  workspaceId: z.string().min(1),
  promisedDate: z.string().datetime(),
  promisedAmount: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
})

export const POST = withApiHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id: debtId } = await params
    const user = await requireUser(request)
    const userId = user.id
    const body = await request.json()
    const parsed = createPromiseSchema.safeParse(body)

    if (!parsed.success) {
      throw apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid request body",
        400,
        parsed.error
      )
    }

    await requireWorkspaceMember(prisma, userId, parsed.data.workspaceId)

    const debt = await prisma.debt.findFirst({
      where: {
        id: debtId,
        workspaceId: parsed.data.workspaceId,
        deletedAt: null,
      },
      select: { id: true, personId: true },
    })
    if (!debt) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Debt not found", 404)
    }

    const promise = await prisma.promise.create({
      data: {
        workspaceId: parsed.data.workspaceId,
        debtId: debt.id,
        promisedDate: new Date(parsed.data.promisedDate),
        promisedAmount: parsed.data.promisedAmount ?? undefined,
        note: parsed.data.note ?? undefined,
      },
    })

    await logActivity({
      workspaceId: parsed.data.workspaceId,
      userId,
      type: "PROMISE_CREATED",
      personId: debt.personId,
      debtId: debt.id,
    })

    return NextResponse.json(ok(promise))
  }
)

export const GET = withApiHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id: debtId } = await params
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

    const debt = await prisma.debt.findFirst({
      where: { id: debtId, workspaceId, deletedAt: null },
      select: { id: true },
    })
    if (!debt) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Debt not found", 404)
    }

    const promises = await prisma.promise.findMany({
      where: { debtId: debt.id, workspaceId },
      orderBy: { promisedDate: "desc" },
    })

    return NextResponse.json(ok(promises))
  }
)

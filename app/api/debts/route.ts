import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/services/activity"
import { computeDebtBalance, computeDebtStatus, toDebtDTO } from "@/lib/services/debt"
import { createDebtSchema } from "@/lib/validators/debt"

const statusSchema = z.enum(["PENDING", "PAID", "OVERDUE"])
const directionSchema = z.enum(["RECEIVABLE", "PAYABLE"])

function toDateOrNull(value?: string | null) {
  if (value === undefined) return undefined
  if (value === null) return null
  return new Date(value)
}

function sumPayments(payments: { amount: { toNumber: () => number } }[]) {
  return payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0)
}

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

  await requireWorkspaceMember(prisma, userId, workspaceId)

  const personId = searchParams.get("personId")?.trim()
  const statusParam = searchParams.get("status")?.trim()
  const directionParam = searchParams.get("direction")?.trim()
  const overdueParam = searchParams.get("overdue")?.trim()

  let statusFilter: z.infer<typeof statusSchema> | undefined
  if (statusParam) {
    const parsedStatus = statusSchema.safeParse(statusParam)
    if (!parsedStatus.success) {
      throw apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid status filter",
        400,
        parsedStatus.error
      )
    }
    statusFilter = parsedStatus.data
  }

  let directionFilter: z.infer<typeof directionSchema> | undefined
  if (directionParam) {
    const parsedDirection = directionSchema.safeParse(directionParam)
    if (!parsedDirection.success) {
      throw apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid direction filter",
        400,
        parsedDirection.error
      )
    }
    directionFilter = parsedDirection.data
  }

  const debts = await prisma.debt.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      ...(personId ? { personId } : {}),
      ...(directionFilter ? { direction: directionFilter } : {}),
    },
    include: {
      person: {
        select: { id: true, name: true, phone: true },
      },
      payments: {
        select: { amount: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const data = debts
    .map((debt) => {
      const paymentsSum = sumPayments(debt.payments)
      const balance = computeDebtBalance(debt, paymentsSum)
      return {
        dto: toDebtDTO(debt, paymentsSum, debt.person),
        status: computeDebtStatus(balance, debt.dueDate),
      }
    })
    .filter((entry) => {
      if (overdueParam === "true" && entry.status !== "OVERDUE") {
        return false
      }
      if (statusFilter && entry.status !== statusFilter) {
        return false
      }
      return true
    })
    .map((entry) => entry.dto)

  return NextResponse.json(ok(data))
})

export const POST = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id
  const body = await request.json()
  const parsed = createDebtSchema.safeParse(body)

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid request body",
      400,
      parsed.error
    )
  }

  await requireWorkspaceMember(prisma, userId, parsed.data.workspaceId)

  const person = await prisma.person.findFirst({
    where: {
      id: parsed.data.personId,
      workspaceId: parsed.data.workspaceId,
      deletedAt: null,
    },
    select: { id: true, name: true, phone: true },
  })

  if (!person) {
    throw apiError(ERROR_CODES.NOT_FOUND, "Person not found", 404)
  }

  const debt = await prisma.debt.create({
    data: {
      workspaceId: parsed.data.workspaceId,
      personId: parsed.data.personId,
      direction: parsed.data.direction,
      type: parsed.data.type ?? undefined,
      title: parsed.data.title ?? undefined,
      description: parsed.data.description ?? undefined,
      currency: parsed.data.currency ?? "USD",
      amountOriginal: parsed.data.amountOriginal,
      dueDate: toDateOrNull(parsed.data.dueDate) ?? undefined,
      issuedAt: toDateOrNull(parsed.data.issuedAt) ?? undefined,
      hasInterest: parsed.data.hasInterest ?? undefined,
      interestRatePct: parsed.data.interestRatePct ?? undefined,
      interestPeriod: parsed.data.interestPeriod ?? undefined,
      minSuggestedPayment: parsed.data.minSuggestedPayment ?? undefined,
      splitCount: parsed.data.splitCount ?? undefined,
      splitEach: parsed.data.splitEach ?? undefined,
    },
    include: {
      payments: { select: { amount: true } },
    },
  })

  await logActivity({
    workspaceId: parsed.data.workspaceId,
    userId,
    type: "DEBT_CREATED",
    personId: person.id,
    debtId: debt.id,
  })

  const paymentsSum = sumPayments(debt.payments)
  return NextResponse.json(ok(toDebtDTO(debt, paymentsSum, person)))
})

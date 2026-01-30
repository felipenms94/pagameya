import { NextResponse } from "next/server"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/services/activity"
import { toDebtDTO } from "@/lib/services/debt"
import { createPaymentSchema } from "@/lib/validators/payment"

function toDateOrNull(value?: string | null) {
  if (value === undefined) return undefined
  if (value === null) return null
  return new Date(value)
}

function sumPayments(payments: { amount: { toNumber: () => number } }[]) {
  return payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0)
}

async function fetchDebt(workspaceId: string, debtId: string) {
  return prisma.debt.findFirst({
    where: { id: debtId, workspaceId, deletedAt: null },
    include: {
      person: { select: { id: true, name: true, phone: true } },
      payments: { select: { amount: true } },
    },
  })
}

export const POST = withApiHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id: debtId } = await params
    const user = await requireUser(request)
    const userId = user.id
    const body = await request.json()
    const parsed = createPaymentSchema.safeParse(body)

    if (!parsed.success) {
      throw apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid request body",
        400,
        parsed.error
      )
    }

    await requireWorkspaceMember(prisma, userId, parsed.data.workspaceId)

    const debt = await fetchDebt(parsed.data.workspaceId, debtId)
    if (!debt) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Debt not found", 404)
    }

    const payment = await prisma.payment.create({
      data: {
        workspaceId: parsed.data.workspaceId,
        debtId: debt.id,
        amount: parsed.data.amount,
        paidAt: toDateOrNull(parsed.data.paidAt) ?? undefined,
        paymentTypeId: parsed.data.paymentTypeId ?? undefined,
        note: parsed.data.note ?? undefined,
      },
    })

    await logActivity({
      workspaceId: parsed.data.workspaceId,
      userId,
      type: "PAYMENT_CREATED",
      personId: debt.personId,
      debtId: debt.id,
      paymentId: payment.id,
    })

    const updated = await fetchDebt(parsed.data.workspaceId, debtId)
    if (!updated) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Debt not found", 404)
    }

    const paymentsSum = sumPayments(updated.payments)
    return NextResponse.json(
      ok(toDebtDTO(updated, paymentsSum, updated.person))
    )
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
      select: { id: true, personId: true },
    })
    if (!debt) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Debt not found", 404)
    }

    const payments = await prisma.payment.findMany({
      where: { debtId: debt.id, workspaceId },
      orderBy: { paidAt: "desc" },
    })

    return NextResponse.json(
      ok(
        payments.map((payment) => ({
          id: payment.id,
          debtId: payment.debtId,
          workspaceId: payment.workspaceId,
          amount: payment.amount.toNumber(),
          paidAt: payment.paidAt,
          paymentTypeId: payment.paymentTypeId,
          note: payment.note,
          createdAt: payment.createdAt,
        }))
      )
    )
  }
)

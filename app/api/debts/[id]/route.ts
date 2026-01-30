import { NextResponse } from "next/server"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/services/activity"
import { toDebtDTO } from "@/lib/services/debt"
import { updateDebtSchema } from "@/lib/validators/debt"

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
      payments: {
        select: {
          id: true,
          amount: true,
          paidAt: true,
          paymentTypeId: true,
          note: true,
          createdAt: true,
        },
        orderBy: { paidAt: "desc" },
      },
    },
  })
}

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

    const debt = await fetchDebt(workspaceId, debtId)
    if (!debt) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Debt not found", 404)
    }

    const paymentsSum = sumPayments(debt.payments)
    const dto = toDebtDTO(debt, paymentsSum, debt.person)

    return NextResponse.json(
      ok({
        ...dto,
        payments: debt.payments.map((payment) => ({
          id: payment.id,
          amount: payment.amount.toNumber(),
          paidAt: payment.paidAt,
          paymentTypeId: payment.paymentTypeId,
          note: payment.note,
          createdAt: payment.createdAt,
        })),
      })
    )
  }
)

export const PATCH = withApiHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id: debtId } = await params
    const user = await requireUser(request)
    const userId = user.id
    const body = await request.json()
    const parsed = updateDebtSchema.safeParse(body)

    if (!parsed.success) {
      throw apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid request body",
        400,
        parsed.error
      )
    }

    const { workspaceId, personId, ...updates } = parsed.data

    await requireWorkspaceMember(prisma, userId, workspaceId)

    const existing = await fetchDebt(workspaceId, debtId)
    if (!existing) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Debt not found", 404)
    }

    if (personId) {
      const person = await prisma.person.findFirst({
        where: { id: personId, workspaceId, deletedAt: null },
        select: { id: true },
      })
      if (!person) {
        throw apiError(ERROR_CODES.NOT_FOUND, "Person not found", 404)
      }
    }

    await prisma.debt.update({
      where: { id: existing.id },
      data: {
        personId: personId ?? undefined,
        direction: updates.direction ?? undefined,
        type: updates.type ?? undefined,
        title: updates.title ?? undefined,
        description: updates.description ?? undefined,
        currency: updates.currency ?? undefined,
        amountOriginal: updates.amountOriginal ?? undefined,
        dueDate: toDateOrNull(updates.dueDate),
        issuedAt: updates.issuedAt ? new Date(updates.issuedAt) : undefined,
        hasInterest: updates.hasInterest ?? undefined,
        interestRatePct: updates.interestRatePct ?? undefined,
        interestPeriod: updates.interestPeriod ?? undefined,
        minSuggestedPayment: updates.minSuggestedPayment ?? undefined,
        splitCount: updates.splitCount ?? undefined,
        splitEach: updates.splitEach ?? undefined,
      },
    })

    const updated = await fetchDebt(workspaceId, debtId)
    if (!updated) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Debt not found", 404)
    }

    await logActivity({
      workspaceId,
      userId,
      type: "DEBT_UPDATED",
      personId: updated.personId,
      debtId: updated.id,
    })

    const paymentsSum = sumPayments(updated.payments)
    return NextResponse.json(ok(toDebtDTO(updated, paymentsSum, updated.person)))
  }
)

export const DELETE = withApiHandler(
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

    const existing = await prisma.debt.findFirst({
      where: { id: debtId, workspaceId, deletedAt: null },
      select: { id: true, personId: true },
    })
    if (!existing) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Debt not found", 404)
    }

    await prisma.debt.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })

    await logActivity({
      workspaceId,
      userId,
      type: "DEBT_UPDATED",
      personId: existing.personId,
      debtId: existing.id,
      message: "Debt deleted",
    })

    return NextResponse.json(ok({ id: existing.id }))
  }
)

import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import {
  computeDebtBalance,
  computeDebtStatus,
  getLocalDateKey,
  toDebtDTO,
} from "@/lib/services/debt"

const directionSchema = z.enum(["RECEIVABLE", "PAYABLE"])

async function getPaymentSumsByDebtId(workspaceId: string, debtIds: string[]) {
  if (debtIds.length === 0) return new Map<string, number>()

  const grouped = await prisma.payment.groupBy({
    by: ["debtId"],
    where: { workspaceId, debtId: { in: debtIds } },
    _sum: { amount: true },
  })

  return new Map(
    grouped.map((entry) => [
      entry.debtId,
      entry._sum.amount?.toNumber() ?? 0,
    ])
  )
}

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")?.trim()
  const directionParam = searchParams.get("direction")?.trim()

  if (!workspaceId) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "workspaceId is required",
      400
    )
  }

  if (!directionParam) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "direction is required",
      400
    )
  }

  const parsedDirection = directionSchema.safeParse(directionParam)
  if (!parsedDirection.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid direction",
      400,
      parsedDirection.error
    )
  }

  await requireWorkspaceMember(prisma, userId, workspaceId)

  const todayKey = getLocalDateKey(new Date())

  const debts = await prisma.debt.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      direction: parsedDirection.data,
      person: { deletedAt: null },
    },
    include: {
      person: { select: { id: true, name: true, phone: true } },
    },
  })

  const debtIds = debts.map((debt) => debt.id)
  const paymentSums = await getPaymentSumsByDebtId(workspaceId, debtIds)

  const promisesToday = await prisma.promise.findMany({
    where: {
      workspaceId,
      debtId: { in: debtIds },
    },
    select: { debtId: true, promisedDate: true },
  })
  const duePromiseSet = new Set(
    promisesToday
      .filter((promise) => promise.promisedDate)
      .filter(
        (promise) => getLocalDateKey(promise.promisedDate) === todayKey
      )
      .map((promise) => promise.debtId)
  )

  const items = debts
    .map((debt) => {
      const paymentsSum = paymentSums.get(debt.id) ?? 0
      const balance = computeDebtBalance(debt, paymentsSum)
      if (balance <= 0) return null

      const status = computeDebtStatus(balance, debt.dueDate)
      let reason: "OVERDUE" | "DUE_TODAY" | "PROMISE_TODAY" | null = null

      if (status === "OVERDUE") {
        reason = "OVERDUE"
      } else if (debt.dueDate && getLocalDateKey(debt.dueDate) === todayKey) {
        reason = "DUE_TODAY"
      } else if (duePromiseSet.has(debt.id)) {
        reason = "PROMISE_TODAY"
      }

      if (!reason) return null

      return {
        debt: toDebtDTO(debt, paymentsSum, debt.person),
        reason,
      }
    })
    .filter((item) => item !== null)
    .sort((a, b) => {
      const order = {
        OVERDUE: 0,
        DUE_TODAY: 1,
        PROMISE_TODAY: 2,
      }
      return order[a!.reason] - order[b!.reason]
    })

  return NextResponse.json(ok(items))
})

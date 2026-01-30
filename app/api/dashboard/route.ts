import { NextResponse } from "next/server"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { computeDebtBalance, getLocalDateKey } from "@/lib/services/debt"

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

import type { Decimal } from "@prisma/client/runtime/library"

type DebtForSum = {
  id: string
  amountOriginal: Decimal | number
  hasInterest: boolean
  interestRatePct: Decimal | number | null
  interestPeriod: string | null
  issuedAt: Date
  dueDate: Date | null
}

function sumTotals(
  debts: DebtForSum[],
  paymentSums: Map<string, number>
) {
  const todayKey = getLocalDateKey(new Date())

  let totalOpen = 0
  let overdue = 0
  let dueToday = 0

  debts.forEach((debt) => {
    const paymentsSum = paymentSums.get(debt.id) ?? 0
    const balance = computeDebtBalance(debt, paymentsSum)
    if (balance <= 0) return

    totalOpen += balance

    if (debt.dueDate) {
      const dueKey = getLocalDateKey(debt.dueDate)
      if (dueKey < todayKey) {
        overdue += balance
        return
      }
      if (dueKey === todayKey) {
        dueToday += balance
      }
    }
  })

  return { totalOpen, overdue, dueToday }
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

  const debts = await prisma.debt.findMany({
    where: { workspaceId, deletedAt: null },
    select: {
      id: true,
      direction: true,
      amountOriginal: true,
      hasInterest: true,
      interestRatePct: true,
      interestPeriod: true,
      issuedAt: true,
      dueDate: true,
    },
  })

  const paymentSums = await getPaymentSumsByDebtId(
    workspaceId,
    debts.map((debt) => debt.id)
  )

  const receivableDebts = debts.filter(
    (debt) => debt.direction === "RECEIVABLE"
  )
  const payableDebts = debts.filter((debt) => debt.direction === "PAYABLE")

  return NextResponse.json(
    ok({
      workspaceId,
      totals: {
        receivable: sumTotals(receivableDebts, paymentSums),
        payable: sumTotals(payableDebts, paymentSums),
      },
    })
  )
})

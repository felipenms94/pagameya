import { z } from "zod"
import * as XLSX from "xlsx"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { computeDebtBalance, computeDebtStatus } from "@/lib/services/debt"

const statusSchema = z.enum(["PENDING", "PAID", "OVERDUE"])
const directionSchema = z.enum(["RECEIVABLE", "PAYABLE"])

function toNumber(value: { toNumber: () => number } | number) {
  return typeof value === "number" ? value : value.toNumber()
}

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")?.trim()
  const directionParam = searchParams.get("direction")?.trim()
  const statusParam = searchParams.get("status")?.trim()
  const personId = searchParams.get("personId")?.trim()

  if (!workspaceId) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "workspaceId is required",
      400
    )
  }

  await requireWorkspaceMember(prisma, userId, workspaceId)

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

  const debts = await prisma.debt.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      ...(personId ? { personId } : {}),
      ...(directionFilter ? { direction: directionFilter } : {}),
    },
    include: {
      person: { select: { id: true, name: true } },
      payments: {
        include: { paymentType: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const debtRows: Array<Record<string, string | number | null>> = []
  const paymentRows: Array<Record<string, string | number | null>> = []

  debts.forEach((debt) => {
    const paymentsSum = debt.payments.reduce(
      (sum, payment) => sum + payment.amount.toNumber(),
      0
    )
    const balance = computeDebtBalance(debt, paymentsSum)
    const status = computeDebtStatus(balance, debt.dueDate)

    if (statusFilter && status !== statusFilter) return

    debtRows.push({
      createdAt: debt.createdAt.toISOString(),
      personName: debt.person.name,
      direction: debt.direction,
      title: debt.title ?? "",
      amountOriginal: toNumber(debt.amountOriginal),
      paymentsSum,
      balance,
      status,
      dueDate: debt.dueDate ? debt.dueDate.toISOString() : "",
    })

    debt.payments.forEach((payment) => {
      paymentRows.push({
        paidAt: payment.paidAt.toISOString(),
        personName: debt.person.name,
        debtTitle: debt.title ?? "",
        amount: payment.amount.toNumber(),
        paymentTypeName: payment.paymentType?.name ?? "",
        note: payment.note ?? "",
      })
    })
  })

  const workbook = XLSX.utils.book_new()
  const debtsSheet = XLSX.utils.json_to_sheet(debtRows, {
    header: [
      "createdAt",
      "personName",
      "direction",
      "title",
      "amountOriginal",
      "paymentsSum",
      "balance",
      "status",
      "dueDate",
    ],
  })
  const paymentsSheet = XLSX.utils.json_to_sheet(paymentRows, {
    header: [
      "paidAt",
      "personName",
      "debtTitle",
      "amount",
      "paymentTypeName",
      "note",
    ],
  })

  XLSX.utils.book_append_sheet(workbook, debtsSheet, "Debts")
  XLSX.utils.book_append_sheet(workbook, paymentsSheet, "Payments")

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="debts.xlsx"',
    },
  })
})

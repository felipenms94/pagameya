import { DebtDirection, PriorityLevel, PrismaClient } from "@prisma/client"

import { computeDebtBalance, getLocalDateKey } from "@/lib/services/debt"

export type AlertKind =
  | "OVERDUE"
  | "DUE_TODAY"
  | "DUE_SOON"
  | "HIGH_PRIORITY"
  | "PROMISE_TODAY"

export type AlertItem = {
  kind: AlertKind
  direction: DebtDirection
  debtId: string
  personId: string
  personName: string
  personPhone: string | null
  debtTitle: string
  dueDate: string | null
  promisedDate: string | null
  balance: number
  priority: PriorityLevel | null
}

type AlertCounts = {
  overdueCount: number
  dueTodayCount: number
  dueSoonCount: number
  highPriorityCount: number
  promiseTodayCount: number
}

export type AlertsSummary = {
  receivable: AlertCounts
  payable: AlertCounts
}

export type AlertsData = {
  workspaceId: string
  asOfLocalDate: string
  summary: AlertsSummary
  items: AlertItem[]
}

const kindPriority: Record<AlertKind, number> = {
  OVERDUE: 0,
  PROMISE_TODAY: 1,
  DUE_TODAY: 2,
  DUE_SOON: 3,
  HIGH_PRIORITY: 4,
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function diffLocalDays(from: Date, to: Date) {
  const fromStart = startOfLocalDay(from)
  const toStart = startOfLocalDay(to)
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((toStart.getTime() - fromStart.getTime()) / msPerDay)
}

function toIsoOrNull(date: Date | null) {
  return date ? date.toISOString() : null
}

function emptyCounts(): AlertCounts {
  return {
    overdueCount: 0,
    dueTodayCount: 0,
    dueSoonCount: 0,
    highPriorityCount: 0,
    promiseTodayCount: 0,
  }
}

async function getPaymentSumsByDebtId(
  prisma: PrismaClient,
  workspaceId: string,
  debtIds: string[]
) {
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

export async function getAlertsData(
  prisma: PrismaClient,
  workspaceId: string,
  direction?: DebtDirection
): Promise<AlertsData> {
  const debts = await prisma.debt.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      person: { deletedAt: null },
      ...(direction ? { direction } : {}),
    },
    select: {
      id: true,
      personId: true,
      direction: true,
      title: true,
      dueDate: true,
      amountOriginal: true,
      hasInterest: true,
      interestRatePct: true,
      interestPeriod: true,
      issuedAt: true,
      person: {
        select: {
          name: true,
          phone: true,
          priority: true,
        },
      },
    },
  })

  const debtIds = debts.map((debt) => debt.id)
  const paymentSums = await getPaymentSumsByDebtId(prisma, workspaceId, debtIds)

  const promises = await prisma.promise.findMany({
    where: { workspaceId, debtId: { in: debtIds } },
    select: { debtId: true, promisedDate: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  const today = new Date()
  const todayKey = getLocalDateKey(today)

  const promiseTodayByDebtId = new Map<string, Date>()
  for (const promise of promises) {
    if (getLocalDateKey(promise.promisedDate) !== todayKey) continue
    if (!promiseTodayByDebtId.has(promise.debtId)) {
      promiseTodayByDebtId.set(promise.debtId, promise.promisedDate)
    }
  }

  const assignedItemsByDebtId = new Map<string, AlertItem>()

  for (const debt of debts) {
    const paymentsSum = paymentSums.get(debt.id) ?? 0
    const balance = computeDebtBalance(debt, paymentsSum)
    if (balance <= 0) continue

    const dueDate = debt.dueDate
    const promisedToday = promiseTodayByDebtId.get(debt.id) ?? null

    const daysUntilDue = dueDate ? diffLocalDays(today, dueDate) : null
    const dueKey = dueDate ? getLocalDateKey(dueDate) : null

    const isOverdue = dueKey !== null && dueKey < todayKey
    const isDueToday = dueKey !== null && dueKey === todayKey
    const isDueSoon =
      daysUntilDue !== null && daysUntilDue >= 1 && daysUntilDue <= 3
    const isHighPriority = debt.person.priority === PriorityLevel.HIGH
    const isPromiseToday = promisedToday !== null

    let kind: AlertKind | null = null
    if (isOverdue) {
      kind = "OVERDUE"
    } else if (isPromiseToday) {
      kind = "PROMISE_TODAY"
    } else if (isDueToday) {
      kind = "DUE_TODAY"
    } else if (isDueSoon) {
      kind = "DUE_SOON"
    } else if (isHighPriority) {
      kind = "HIGH_PRIORITY"
    }

    if (!kind) continue

    assignedItemsByDebtId.set(debt.id, {
      kind,
      direction: debt.direction,
      debtId: debt.id,
      personId: debt.personId,
      personName: debt.person.name,
      personPhone: debt.person.phone,
      debtTitle: debt.title ?? "Sin titulo",
      dueDate: toIsoOrNull(dueDate),
      promisedDate: toIsoOrNull(promisedToday),
      balance,
      priority: debt.person.priority ?? null,
    })
  }

  const allItems = Array.from(assignedItemsByDebtId.values())

  const summary: AlertsSummary = {
    receivable: emptyCounts(),
    payable: emptyCounts(),
  }

  for (const item of allItems) {
    const bucket =
      item.direction === DebtDirection.RECEIVABLE
        ? summary.receivable
        : summary.payable

    if (item.kind === "OVERDUE") bucket.overdueCount += 1
    if (item.kind === "DUE_TODAY") bucket.dueTodayCount += 1
    if (item.kind === "DUE_SOON") bucket.dueSoonCount += 1
    if (item.kind === "HIGH_PRIORITY") bucket.highPriorityCount += 1
    if (item.kind === "PROMISE_TODAY") bucket.promiseTodayCount += 1
  }

  const sortedItems = allItems.sort((a, b) => {
    const kindDiff = kindPriority[a.kind] - kindPriority[b.kind]
    if (kindDiff !== 0) return kindDiff
    return b.balance - a.balance
  })

  return {
    workspaceId,
    asOfLocalDate: todayKey,
    summary,
    items: sortedItems.slice(0, 50),
  }
}
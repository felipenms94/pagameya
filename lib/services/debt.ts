import { DebtStatus } from "@prisma/client"
import { Decimal } from "@prisma/client/runtime/library"

type PersonSummary = {
  id: string
  name: string
  phone: string | null
}

type DebtInput = {
  id: string
  workspaceId: string
  personId: string
  direction: string
  type: string
  title: string | null
  description: string | null
  currency: string
  amountOriginal: Decimal | number
  dueDate: Date | null
  issuedAt: Date
  hasInterest: boolean
  interestRatePct: Decimal | number | null
  interestPeriod: string | null
  minSuggestedPayment: Decimal | number | null
  splitCount: number | null
  splitEach: Decimal | number | null
  createdAt: Date
}

function toNumber(value: Decimal | number | null | undefined) {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  return value.toNumber()
}

type DebtForCalc = {
  amountOriginal: Decimal | number
  hasInterest: boolean
  interestRatePct: Decimal | number | null
  interestPeriod: string | null
  issuedAt: Date
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function diffMonths(start: Date, end: Date) {
  const startDay = startOfLocalDay(start)
  const endDay = startOfLocalDay(end)
  let months =
    (endDay.getFullYear() - startDay.getFullYear()) * 12 +
    (endDay.getMonth() - startDay.getMonth())
  if (endDay.getDate() < startDay.getDate()) {
    months -= 1
  }
  return Math.max(0, months)
}

function round2(value: number) {
  return Number(value.toFixed(2))
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate())
}

type ScheduleInstallment = {
  installmentNumber: number
  dueDate: string
  amount: number
}

export function computeDebtSummary(
  debt: DebtForCalc,
  paymentsSum: Decimal | number
) {
  const payments = toNumber(paymentsSum)
  const principalOutstanding = Math.max(
    toNumber(debt.amountOriginal) - payments,
    0
  )
  let interestAccrued = 0

  const hasInterest =
    debt.hasInterest && debt.interestRatePct !== null

  if (hasInterest) {
    const monthsElapsed = diffMonths(debt.issuedAt, new Date())
    interestAccrued =
      principalOutstanding * (toNumber(debt.interestRatePct) / 100) * monthsElapsed
  }

  const totalDue = hasInterest
    ? principalOutstanding + interestAccrued
    : toNumber(debt.amountOriginal)
  const balance = hasInterest ? totalDue : principalOutstanding

  return {
    principalOutstanding,
    interestAccrued,
    totalDue,
    balance,
  }
}

export function computeDebtBalance(
  debt: DebtForCalc,
  paymentsSum: Decimal | number
) {
  return round2(computeDebtSummary(debt, paymentsSum).balance)
}

function pad(value: number) {
  return value.toString().padStart(2, "0")
}

export function getLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`
}

export function computeDebtStatus(balance: number, dueDate: Date | null) {
  if (balance <= 0) return DebtStatus.PAID
  if (dueDate) {
    const todayKey = getLocalDateKey(new Date())
    const dueKey = getLocalDateKey(dueDate)
    if (dueKey < todayKey) return DebtStatus.OVERDUE
  }
  return DebtStatus.PENDING
}

export function toDebtDTO(
  debt: DebtInput,
  paymentsSum: Decimal | number,
  person: PersonSummary
) {
  const summary = computeDebtSummary(debt, paymentsSum)
  const balance = round2(summary.balance)
  const status = computeDebtStatus(balance, debt.dueDate)
  const totalDue = round2(summary.totalDue)
  const interestAccrued = round2(summary.interestAccrued)
  const suggestedPayments = (() => {
    if (balance <= 0) return []

    const candidates: number[] = []
    if (debt.minSuggestedPayment !== null) {
      const min = round2(toNumber(debt.minSuggestedPayment))
      candidates.push(min, round2(min * 2), round2(min * 3))
    } else {
      const base = round2(Math.min(50, Math.max(5, balance * 0.1)))
      candidates.push(base, 10, 20, 50)
    }

    return Array.from(
      new Set(candidates.filter((value) => value > 0 && value <= balance))
    ).sort((a, b) => a - b)
  })()

  const { scheduleSuggested, splitEach } = (() => {
    if (!debt.splitCount || debt.splitCount <= 0) {
      return { scheduleSuggested: null, splitEach: null }
    }

    const count = debt.splitCount
    const baseEach = round2(totalDue / count)
    const firstDate = debt.dueDate ?? addMonths(debt.issuedAt, 1)

    const installments: ScheduleInstallment[] = []
    for (let i = 0; i < count; i += 1) {
      const dueDate = addMonths(firstDate, i)
      const amount =
        i === count - 1
          ? round2(totalDue - baseEach * (count - 1))
          : baseEach

      installments.push({
        installmentNumber: i + 1,
        dueDate: dueDate.toISOString(),
        amount,
      })
    }

    return { scheduleSuggested: installments, splitEach: baseEach }
  })()

  return {
    id: debt.id,
    workspaceId: debt.workspaceId,
    personId: debt.personId,
    direction: debt.direction,
    type: debt.type,
    title: debt.title,
    description: debt.description,
    currency: debt.currency,
    amountOriginal: toNumber(debt.amountOriginal),
    totalDue,
    interestAccrued,
    suggestedPayments,
    scheduleSuggested,
    balance,
    status,
    dueDate: debt.dueDate,
    issuedAt: debt.issuedAt,
    hasInterest: debt.hasInterest,
    interestRatePct:
      debt.interestRatePct === null ? null : toNumber(debt.interestRatePct),
    interestPeriod: debt.interestPeriod,
    minSuggestedPayment:
      debt.minSuggestedPayment === null
        ? null
        : toNumber(debt.minSuggestedPayment),
    splitCount: debt.splitCount,
    splitEach,
    createdAt: debt.createdAt,
    person: {
      id: person.id,
      name: person.name,
      phone: person.phone,
    },
  }
}

import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { computeDebtBalance, computeDebtSummary } from "@/lib/services/debt"

const toneSchema = z.enum(["soft", "normal", "strong", "fuerte"])

type NormalizedTone = "soft" | "normal" | "strong"

function normalizeTone(tone: z.infer<typeof toneSchema>): NormalizedTone {
  if (tone === "fuerte") return "strong"
  return tone
}

function normalizePhone(raw: string) {
  const cleaned = raw.replace(/[\s-]/g, "")
  if (cleaned.startsWith("+")) return cleaned
  if (cleaned.startsWith("0")) return `+593${cleaned.slice(1)}`
  return cleaned
}

function formatDueDate(dueDate: Date | null) {
  if (!dueDate) return "sin fecha"
  return dueDate.toISOString().slice(0, 10)
}

function formatBalance(balance: number) {
  return balance.toFixed(2)
}

function buildMessage(
  tone: NormalizedTone,
  name: string,
  balance: number,
  dueDate: Date | null
) {
  const balanceText = formatBalance(balance)
  const dueDateText = formatDueDate(dueDate)

  switch (tone) {
    case "soft":
      return `Hola ${name}, espero estes bien. Te escribo para recordarte el saldo pendiente de $${balanceText}. Me confirmas cuando podrias ponerte al dia? Gracias.`
    case "normal":
      return `Hola ${name}. Te recuerdo que tienes un saldo pendiente de $${balanceText} con vencimiento ${dueDateText}. Quedo atento a tu pago.`
    case "strong":
      return `Hola ${name}. Te notifico que el saldo pendiente de $${balanceText} esta vencido. Por favor regulariza el pago hoy para evitar inconvenientes.`
  }
}

function renderTemplate(
  template: string,
  variables: Record<string, string>
) {
  let output = template
  for (const [key, value] of Object.entries(variables)) {
    output = output.replaceAll(`{${key}}`, value)
  }
  return output
}

async function getPaymentSum(workspaceId: string, debtId: string) {
  const grouped = await prisma.payment.groupBy({
    by: ["debtId"],
    where: { workspaceId, debtId },
    _sum: { amount: true },
  })
  return grouped[0]?._sum.amount?.toNumber() ?? 0
}

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")?.trim()
  const personId = searchParams.get("personId")?.trim()
  const debtId = searchParams.get("debtId")?.trim()
  const toneParam = searchParams.get("tone")?.trim()

  if (!workspaceId || !personId || !debtId || !toneParam) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "workspaceId, personId, debtId, and tone are required",
      400
    )
  }

  const parsedTone = toneSchema.safeParse(toneParam)
  if (!parsedTone.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid tone",
      400,
      parsedTone.error
    )
  }

  await requireWorkspaceMember(prisma, userId, workspaceId)

  const person = await prisma.person.findFirst({
    where: { id: personId, workspaceId, deletedAt: null },
    select: { id: true, name: true, phone: true },
  })
  if (!person) {
    throw apiError(ERROR_CODES.NOT_FOUND, "Person not found", 404)
  }

  if (!person.phone) {
    throw apiError(
      ERROR_CODES.CONFLICT,
      "Person does not have a phone number",
      409
    )
  }

  const debt = await prisma.debt.findFirst({
    where: { id: debtId, workspaceId, deletedAt: null },
    select: {
      id: true,
      personId: true,
      amountOriginal: true,
      hasInterest: true,
      interestRatePct: true,
      interestPeriod: true,
      issuedAt: true,
      dueDate: true,
      title: true,
    },
  })
  if (!debt) {
    throw apiError(ERROR_CODES.NOT_FOUND, "Debt not found", 404)
  }

  if (debt.personId !== person.id) {
    throw apiError(ERROR_CODES.CONFLICT, "Debt does not match person", 409)
  }

  const paymentsSum = await getPaymentSum(workspaceId, debt.id)
  const balance = computeDebtBalance(debt, paymentsSum)
  const summary = computeDebtSummary(debt, paymentsSum)

  const normalizedTone = normalizeTone(parsedTone.data)

  const latestPromise = await prisma.promise.findFirst({
    where: { workspaceId, debtId: debt.id },
    orderBy: { createdAt: "desc" },
    select: { promisedDate: true },
  })

  const variables = {
    personName: person.name,
    balance: `$${formatBalance(balance)}`,
    debtTitle: debt.title ?? "Sin titulo",
    dueDate: formatDueDate(debt.dueDate ?? null),
    promisedDate: formatDueDate(latestPromise?.promisedDate ?? null),
    totalDue: `$${formatBalance(summary.totalDue)}`,
  }

  const template = await prisma.reminderTemplate.findUnique({
    where: {
      workspaceId_channel_tone: {
        workspaceId,
        channel: "WHATSAPP",
        tone: normalizedTone,
      },
    },
  })

  const messageText = template
    ? renderTemplate(template.body, variables)
    : buildMessage(normalizedTone, person.name, balance, debt.dueDate)

  const phone = normalizePhone(person.phone)
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`

  return NextResponse.json(ok({ url, messageText }))
})
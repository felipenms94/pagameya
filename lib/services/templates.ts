import { PrismaClient, ReminderChannel } from "@prisma/client"

export type TemplateVariables = Record<string, string>

type DateInput = Date | string | null

export function renderTemplate(text: string, variables: TemplateVariables) {
  let output = text
  for (const [key, value] of Object.entries(variables)) {
    output = output.replaceAll(`{${key}}`, value)
  }
  return output
}

export function formatCurrencyUSD(amount: number) {
  return `$${amount.toFixed(2)}`
}

export function formatLocalDate(date: DateInput) {
  if (!date) return "sin fecha"
  const parsed = date instanceof Date ? date : new Date(date)
  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed)
}

export async function getReminderTemplate(
  prisma: PrismaClient,
  workspaceId: string,
  channel: ReminderChannel,
  tone: string
) {
  return prisma.reminderTemplate.findUnique({
    where: {
      workspaceId_channel_tone: {
        workspaceId,
        channel,
        tone,
      },
    },
  })
}
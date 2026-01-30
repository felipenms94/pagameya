import { DebtDirection, PrismaClient, ReminderChannel } from "@prisma/client"

import { getAlertsData } from "@/lib/services/alerts"
import {
  formatCurrencyUSD,
  formatLocalDate,
  getReminderTemplate,
  renderTemplate,
} from "@/lib/services/templates"

type DailyEmail = {
  personId: string
  personName: string
  subject: string
  text: string
  html?: string
}

type WeeklyEmail = {
  subject: string
  text: string
  html?: string
}

type AlertItem = Awaited<ReturnType<typeof getAlertsData>>["items"][number]

type Tone = "soft" | "normal" | "strong"

const tonePriority: Record<Tone, number> = {
  strong: 0,
  normal: 1,
  soft: 2,
}

const toneByKind: Record<string, Tone> = {
  OVERDUE: "strong",
  PROMISE_TODAY: "normal",
  DUE_TODAY: "normal",
  DUE_SOON: "soft",
  HIGH_PRIORITY: "normal",
}

function pickTone(items: AlertItem[]): Tone {
  return items
    .map((item) => toneByKind[item.kind])
    .sort((a, b) => tonePriority[a] - tonePriority[b])[0]
}

function buildVariables(params: {
  personName: string
  balance: number
  totalDue: number
  debtTitle: string
  dueDate: string | null
  promisedDate: string | null
  workspaceName: string
}) {
  return {
    personName: params.personName,
    balance: formatCurrencyUSD(params.balance),
    totalDue: formatCurrencyUSD(params.totalDue),
    debtTitle: params.debtTitle,
    dueDate: formatLocalDate(params.dueDate),
    promisedDate: formatLocalDate(params.promisedDate),
    workspaceName: params.workspaceName,
  }
}

function renderItemsText(items: AlertItem[], workspaceName: string, tone: Tone) {
  const lines = items.map((item) => {
    const vars = buildVariables({
      personName: item.personName,
      balance: item.balance,
      totalDue: item.balance,
      debtTitle: item.debtTitle,
      dueDate: item.dueDate,
      promisedDate: item.promisedDate,
      workspaceName,
    })

    return renderTemplate(
      "- {personName} | {debtTitle} | saldo {balance} | vence {dueDate}",
      vars
    )
  })

  return `Workspace: ${workspaceName}\nTono: ${tone}\n\n${lines.join("\n")}`
}

export async function buildDailyEmails(
  prisma: PrismaClient,
  workspaceId: string,
  workspaceName: string,
  direction?: DebtDirection
): Promise<DailyEmail[]> {
  const alerts = await getAlertsData(prisma, workspaceId, direction)
  if (alerts.items.length === 0) return []

  const itemsByPerson = new Map<string, AlertItem[]>()
  for (const item of alerts.items) {
    const existing = itemsByPerson.get(item.personId) ?? []
    existing.push(item)
    itemsByPerson.set(item.personId, existing)
  }

  const emails: DailyEmail[] = []

  for (const [personId, items] of itemsByPerson.entries()) {
    const tone = pickTone(items)
    const template = await getReminderTemplate(
      prisma,
      workspaceId,
      ReminderChannel.EMAIL,
      tone
    )

    const topItem = items[0]
    const vars = buildVariables({
      personName: topItem.personName,
      balance: topItem.balance,
      totalDue: topItem.balance,
      debtTitle: topItem.debtTitle,
      dueDate: topItem.dueDate,
      promisedDate: topItem.promisedDate,
      workspaceName,
    })

    const subject = template?.title
      ? renderTemplate(template.title, vars)
      : `Recordatorios ${workspaceName} - ${topItem.personName}`

    const textBody = template
      ? renderTemplate(template.body, vars) + "\n\n" + renderItemsText(items, workspaceName, tone)
      : renderItemsText(items, workspaceName, tone)

    const htmlBody = template
      ? `<p>${renderTemplate(template.body, vars)}</p><hr/><pre>${renderItemsText(items, workspaceName, tone)}</pre>`
      : `<pre>${renderItemsText(items, workspaceName, tone)}</pre>`

    emails.push({
      personId,
      personName: topItem.personName,
      subject,
      text: textBody,
      html: htmlBody,
    })
  }

  return emails
}

export async function buildWeeklyEmail(
  prisma: PrismaClient,
  workspaceId: string,
  workspaceName: string,
  direction?: DebtDirection
): Promise<WeeklyEmail | null> {
  const alerts = await getAlertsData(prisma, workspaceId, direction)
  if (alerts.items.length === 0) return null

  const summary = alerts.summary
  const lines = [
    `Workspace: ${workspaceName}`,
    `Receivable: overdue ${summary.receivable.overdueCount}, dueToday ${summary.receivable.dueTodayCount}, dueSoon ${summary.receivable.dueSoonCount}, highPriority ${summary.receivable.highPriorityCount}, promiseToday ${summary.receivable.promiseTodayCount}`,
    `Payable: overdue ${summary.payable.overdueCount}, dueToday ${summary.payable.dueTodayCount}, dueSoon ${summary.payable.dueSoonCount}, highPriority ${summary.payable.highPriorityCount}, promiseToday ${summary.payable.promiseTodayCount}`,
  ]

  const topItems = alerts.items.slice(0, 10).map((item) => {
    const vars = buildVariables({
      personName: item.personName,
      balance: item.balance,
      totalDue: item.balance,
      debtTitle: item.debtTitle,
      dueDate: item.dueDate,
      promisedDate: item.promisedDate,
      workspaceName,
    })
    return renderTemplate(
      "- {personName} | {debtTitle} | saldo {balance} | vence {dueDate}",
      vars
    )
  })

  const subject = `Resumen semanal ${workspaceName}`
  const text = lines.join("\n") + "\n\nTop items:\n" + topItems.join("\n")
  const html = `<pre>${text}</pre>`

  return { subject, text, html }
}
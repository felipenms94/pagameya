// API Response types

export type DebtDirection = "RECEIVABLE" | "PAYABLE"
export type DebtStatus = "PENDING" | "OVERDUE" | "PAID"
export type TodayReason = "OVERDUE" | "DUE_TODAY" | "PROMISE_TODAY"
export type WhatsappTone = "soft" | "normal" | "fuerte"

export type PersonSummary = {
  id: string
  name: string
  phone: string | null
}

export type DebtDTO = {
  id: string
  workspaceId: string
  personId: string
  direction: DebtDirection
  type: string
  title: string | null
  description: string | null
  currency: string
  amountOriginal: number
  totalDue: number
  interestAccrued: number
  suggestedPayments: number[]
  scheduleSuggested: {
    installmentNumber: number
    dueDate: string
    amount: number
  }[] | null
  balance: number
  status: DebtStatus
  dueDate: string | null
  issuedAt: string
  hasInterest: boolean
  interestRatePct: number | null
  interestPeriod: string | null
  minSuggestedPayment: number | null
  splitCount: number | null
  splitEach: number | null
  createdAt: string
  person: PersonSummary
}

export type Payment = {
  id: string
  debtId: string
  workspaceId: string
  amount: number
  paidAt: string
  paymentTypeId: string | null
  note: string | null
  createdAt: string
}

export type DebtDetail = DebtDTO & {
  payments: Payment[]
}

export type PaymentType = {
  id: string
  workspaceId: string
  name: string
  isSystem: boolean
  isActive: boolean
  createdAt: string
}

export type PromiseItem = {
  id: string
  workspaceId: string
  debtId: string
  promisedDate: string
  promisedAmount: number | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export type Reminder = {
  id: string
  workspaceId: string
  debtId: string | null
  channel: "WHATSAPP" | "EMAIL" | "SMS" | "IN_APP"
  scheduledFor: string | null
  sentAt: string | null
  messageText: string | null
  createdAt: string
  updatedAt: string
}

export type ActivityItem = {
  id: string
  type: string
  message: string | null
  createdAt: string
  personId: string | null
  debtId: string | null
  paymentId: string | null
}

export type Attachment = {
  id: string
  workspaceId: string
  debtId: string | null
  fileUrl: string
  note: string | null
  createdAt: string
}

export type TodayItem = {
  debt: DebtDTO
  reason: TodayReason
}

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
  priority: Priority | null
}

export type AlertsSummary = {
  overdueCount: number
  dueTodayCount: number
  dueSoonCount: number
  highPriorityCount: number
  promiseTodayCount: number
}

export type AlertsData = {
  workspaceId: string
  asOfLocalDate: string
  summary: {
    receivable: AlertsSummary
    payable: AlertsSummary
  }
  items: AlertItem[]
}

export type DashboardTotals = {
  totalOpen: number
  overdue: number
  dueToday: number
}

export type DashboardData = {
  workspaceId: string
  totals: {
    receivable: DashboardTotals
    payable: DashboardTotals
  }
}

export type WhatsappLinkData = {
  url: string
  messageText: string
}

export type DebtFormData = {
  personId: string
  direction: DebtDirection
  title?: string | null
  description?: string | null
  amountOriginal: number
  dueDate?: string | null
  currency?: string
  type?: string
  hasInterest?: boolean
  interestRatePct?: number | null
  interestPeriod?: "MONTHLY" | null
  splitCount?: number | null
  minSuggestedPayment?: number | null
}

export type DebtsFilter = {
  direction?: DebtDirection
  status?: DebtStatus
  overdue?: boolean
  personId?: string
}

// Person & Tag types

export type Priority = "LOW" | "MEDIUM" | "HIGH"

export type Tag = {
  id: string
  workspaceId: string
  name: string
  color: string | null
  createdAt: string
}

export type TagSummary = {
  id: string
  name: string
  color: string | null
}

export type Person = {
  id: string
  workspaceId: string
  name: string
  phone: string | null
  email: string | null
  priority: Priority
  notesInternal: string | null
  isFavorite: boolean
  createdAt: string
  tags: TagSummary[]
}

export type PersonFormData = {
  name: string
  phone?: string | null
  email?: string | null
  priority?: Priority
  notesInternal?: string | null
  isFavorite?: boolean
}

export type TagFormData = {
  name: string
  color?: string | null
}

export type PersonsFilter = {
  search?: string
  priority?: Priority
  tagId?: string
}

export type SuggestedReminderItem = {
  id: string
  kind: AlertKind
  direction: DebtDirection
  debtId: string
  personId: string
  personName: string
  personPhone: string | null
  debtTitle: string
  balance: number
  dueDate: string | null
  promisedDate: string | null
  recommendedTone: WhatsappTone
  channels: {
    whatsapp: boolean
    email: boolean
    sms: boolean
  }
}

export type SuggestedRemindersData = {
  workspaceId: string
  asOfLocalDate: string
  items: SuggestedReminderItem[]
}

export type SuggestedAction = "WHATSAPP" | "CALL" | "FOLLOW_UP"
export type RecommendedTone = "soft" | "normal" | "strong"

export type InternalReminderItem = {
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
  priority: Priority | null
  recommendedTone: RecommendedTone
  suggestedAction: SuggestedAction
}

export type InternalRemindersData = {
  workspaceId: string
  asOfLocalDate: string
  summary: {
    receivable: AlertsSummary
    payable: AlertsSummary
  }
  items: InternalReminderItem[]
}

export type EmailPreviewType = "DAILY" | "WEEKLY"

export type EmailPreviewData = {
  subject: string
  text: string
  html?: string
}

export type SendTestEmailInput = {
  toEmail: string
  type: EmailPreviewType
  direction?: DebtDirection
}

export type ReminderChannel = "WHATSAPP" | "EMAIL" | "SMS"
export type ReminderTone = "soft" | "normal" | "strong"

export type ReminderTemplateDTO = {
  id: string
  workspaceId: string
  channel: ReminderChannel
  tone: ReminderTone
  title: string | null
  body: string
  createdAt: string
  updatedAt: string
}

export type OutboundMessageType = "TEST" | "DAILY" | "WEEKLY"
export type OutboundMessageDirection = "ALL" | "RECEIVABLE" | "PAYABLE"
export type OutboundMessageStatus = "SENT" | "FAILED" | "SKIPPED"

export type OutboundMessageLogDTO = {
  id: string
  workspaceId: string
  channel: string
  to: string
  subject: string | null
  bodyPreview: string | null
  status: OutboundMessageStatus
  type: OutboundMessageType
  direction: OutboundMessageDirection
  errorMessage: string | null
  createdAt: string
  sentAt: string | null
}

export type EmailLogsResponse = {
  items: OutboundMessageLogDTO[]
  nextCursor: string | null
}

export type EmailRecipientMode = "OWNERS" | "CUSTOM"

export type EmailSettingsDTO = {
  workspaceId: string
  dailyEnabled: boolean
  dailyHour: number // 0-23
  weeklyEnabled: boolean
  weeklyDay: number // 0=Sunday, 1=Monday, ..., 6=Saturday
  weeklyHour: number // 0-23
  recipientMode: EmailRecipientMode
  customRecipients: string[] // only used if recipientMode === "CUSTOM"
  nextRunDailyAt: string | null // ISO timestamp
  nextRunWeeklyAt: string | null // ISO timestamp
}

export type EmailRunNowType = "DAILY" | "WEEKLY"

export type EmailRunNowResult = {
  type: EmailRunNowType
  sent: number
  failed: number
}

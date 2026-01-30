import {
  PrismaClient,
  WorkspaceMode,
  MemberRole,
  ReminderChannel,
} from "@prisma/client"
import { createUserAuth } from "@/lib/auth/createUserAuth"

const prisma = new PrismaClient()

const SYSTEM_PAYMENT_TYPES = ["Efectivo", "Deposito", "Transferencia", "Cheque"]

async function ensureDemoWorkspaces() {
  const existingBusiness = await prisma.workspace.findFirst({
    where: { name: "Demo Negocio" },
  })
  const existingPersonal = await prisma.workspace.findFirst({
    where: { name: "Demo Personal" },
  })

  const business =
    existingBusiness ??
    (await prisma.workspace.create({
      data: { name: "Demo Negocio", mode: WorkspaceMode.BUSINESS },
    }))
  const personal =
    existingPersonal ??
    (await prisma.workspace.create({
      data: { name: "Demo Personal", mode: WorkspaceMode.PERSONAL },
    }))

  return [business, personal]
}

async function ensureDemoUser() {
  return createUserAuth(
    { email: "demo@pagameya.local", password: "demo1234" },
    { allowUpdate: true, prisma }
  )
}

async function ensureMemberships(userId: string, workspaceIds: string[]) {
  await Promise.all(
    workspaceIds.map((workspaceId) =>
      prisma.membership.upsert({
        where: { userId_workspaceId: { userId, workspaceId } },
        create: { userId, workspaceId, role: MemberRole.OWNER },
        update: { role: MemberRole.OWNER },
      })
    )
  )
}

async function ensureReminderTemplates(workspaceIds: string[]) {
  const templates = workspaceIds.flatMap((workspaceId) => [
    {
      workspaceId,
      channel: ReminderChannel.WHATSAPP,
      tone: "soft",
      title: null,
      body: "Hola {personName}, espero estes bien. Te escribo para recordarte el saldo pendiente de {balance}. Me confirmas cuando podrias ponerte al dia? Gracias.",
    },
    {
      workspaceId,
      channel: ReminderChannel.WHATSAPP,
      tone: "normal",
      title: null,
      body: "Hola {personName}. Te recuerdo que tienes un saldo pendiente de {balance} con vencimiento {dueDate}. Quedo atento a tu pago.",
    },
    {
      workspaceId,
      channel: ReminderChannel.WHATSAPP,
      tone: "strong",
      title: null,
      body: "Hola {personName}. Te notifico que el saldo pendiente de {balance} esta vencido. Por favor regulariza el pago hoy para evitar inconvenientes.",
    },
    {
      workspaceId,
      channel: ReminderChannel.EMAIL,
      tone: "normal",
      title: "Recordatorio {workspaceName}",
      body: "Hola {personName},\n\nTe recordamos el saldo pendiente de {balance} ({debtTitle}). Vence {dueDate}.\n\nGracias,\n{workspaceName}",
    },
  ])

  await prisma.reminderTemplate.createMany({
    data: templates,
    skipDuplicates: true,
  })
}

async function ensureSystemPaymentTypes(workspaceIds: string[]) {
  await Promise.all(
    workspaceIds.map((workspaceId) =>
      Promise.all(
        SYSTEM_PAYMENT_TYPES.map((name) =>
          prisma.paymentType.upsert({
            where: { workspaceId_name: { workspaceId, name } },
            create: { workspaceId, name, isSystem: true, isActive: true },
            update: { isSystem: true, isActive: true },
          })
        )
      )
    )
  )
}

async function ensureEmailSettings(workspaceIds: string[]) {
  await Promise.all(
    workspaceIds.map((workspaceId) =>
      prisma.emailSettings.upsert({
        where: { workspaceId },
        create: { workspaceId },
        update: {},
      })
    )
  )
}

async function main() {
  const demoWorkspaces = await ensureDemoWorkspaces()
  const demoUser = await ensureDemoUser()

  const workspaceIds = demoWorkspaces.map((workspace) => workspace.id)

  await ensureMemberships(demoUser.id, workspaceIds)

  const allWorkspaces = await prisma.workspace.findMany({
    select: { id: true },
  })
  const allWorkspaceIds = allWorkspaces.map((workspace) => workspace.id)
  await ensureReminderTemplates(allWorkspaceIds)
  await ensureSystemPaymentTypes(allWorkspaceIds)
  await ensureEmailSettings(allWorkspaceIds)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })

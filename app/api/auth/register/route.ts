import { NextResponse } from "next/server"
import { z } from "zod"

import { MemberRole, ReminderChannel, WorkspaceMode } from "@prisma/client"
import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { createUserAuth } from "@/lib/auth/createUserAuth"
import { prisma } from "@/lib/prisma"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const POST = withApiHandler(async (request: Request) => {
  const body = await request.json()
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid request body",
      400,
      parsed.error
    )
  }

  const user = await createUserAuth({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  const membershipCount = await prisma.membership.count({
    where: { userId: user.id },
  })

  if (membershipCount === 0) {
    await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: "Personal",
          mode: WorkspaceMode.BUSINESS,
        },
        select: { id: true },
      })

      await tx.membership.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: MemberRole.OWNER,
        },
      })

      await tx.emailSettings.create({
        data: { workspaceId: workspace.id },
      })

      await tx.reminderTemplate.createMany({
        data: [
          {
            workspaceId: workspace.id,
            channel: ReminderChannel.WHATSAPP,
            tone: "soft",
            title: null,
            body: "Hola {personName}, espero estes bien. Te escribo para recordarte el saldo pendiente de {balance}. Me confirmas cuando podrias ponerte al dia? Gracias.",
          },
          {
            workspaceId: workspace.id,
            channel: ReminderChannel.WHATSAPP,
            tone: "normal",
            title: null,
            body: "Hola {personName}. Te recuerdo que tienes un saldo pendiente de {balance} con vencimiento {dueDate}. Quedo atento a tu pago.",
          },
          {
            workspaceId: workspace.id,
            channel: ReminderChannel.WHATSAPP,
            tone: "strong",
            title: null,
            body: "Hola {personName}. Te notifico que el saldo pendiente de {balance} esta vencido. Por favor regulariza el pago hoy para evitar inconvenientes.",
          },
          {
            workspaceId: workspace.id,
            channel: ReminderChannel.EMAIL,
            tone: "normal",
            title: "Recordatorio {workspaceName}",
            body: "Hola {personName},\n\nTe recordamos el saldo pendiente de {balance} ({debtTitle}). Vence {dueDate}.\n\nGracias,\n{workspaceName}",
          },
        ],
        skipDuplicates: true,
      })

      await tx.paymentType.createMany({
        data: [
          { workspaceId: workspace.id, name: "Efectivo", isSystem: true, isActive: true },
          { workspaceId: workspace.id, name: "Deposito", isSystem: true, isActive: true },
          { workspaceId: workspace.id, name: "Transferencia", isSystem: true, isActive: true },
          { workspaceId: workspace.id, name: "Cheque", isSystem: true, isActive: true },
        ],
        skipDuplicates: true,
      })
    })
  }

  return NextResponse.json(ok({ created: true }))
})

import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"

const createAttachmentSchema = z.object({
  workspaceId: z.string().min(1),
  debtId: z.string().nullable().optional(),
  url: z.string().min(1),
  note: z.string().nullable().optional(),
})

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")?.trim()
  const debtId = searchParams.get("debtId")?.trim()
  const personId = searchParams.get("personId")?.trim()

  if (!workspaceId) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "workspaceId is required",
      400
    )
  }

  await requireWorkspaceMember(prisma, userId, workspaceId)

  const attachments = await prisma.attachment.findMany({
    where: {
      workspaceId,
      ...(debtId ? { debtId } : {}),
      ...(personId
        ? {
            debt: {
              personId,
              deletedAt: null,
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(ok(attachments))
})

export const POST = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id
  const body = await request.json()
  const parsed = createAttachmentSchema.safeParse(body)

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid request body",
      400,
      parsed.error
    )
  }

  await requireWorkspaceMember(prisma, userId, parsed.data.workspaceId)

  if (parsed.data.debtId) {
    const debt = await prisma.debt.findFirst({
      where: {
        id: parsed.data.debtId,
        workspaceId: parsed.data.workspaceId,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (!debt) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Debt not found", 404)
    }
  }

  const attachment = await prisma.attachment.create({
    data: {
      workspaceId: parsed.data.workspaceId,
      debtId: parsed.data.debtId ?? undefined,
      fileName: parsed.data.url,
      fileUrl: parsed.data.url,
      note: parsed.data.note ?? undefined,
    },
  })

  return NextResponse.json(ok(attachment))
})

import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { prisma } from "@/lib/prisma"

const resetSchema = z.object({
  token: z.string().min(32),
  newPassword: z.string().min(6),
})

export const POST = withApiHandler(async (request: Request) => {
  const body = await request.json()
  const parsed = resetSchema.safeParse(body)

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid request body",
      400,
      parsed.error
    )
  }

  const token = parsed.data.token.trim()
  const user = await prisma.userAuth.findUnique({
    where: { passwordResetToken: token },
    select: { id: true, passwordResetExpiresAt: true },
  })

  if (!user) {
    throw apiError("INVALID_RESET_TOKEN", "Token invalido", 400)
  }

  if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
    throw apiError("RESET_TOKEN_EXPIRED", "El token ha expirado", 410)
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10)

  await prisma.userAuth.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustResetPassword: false,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  })

  return NextResponse.json(ok({ reset: true }))
})
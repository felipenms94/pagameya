import { NextResponse } from "next/server"
import { z } from "zod"
import crypto from "node:crypto"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { prisma } from "@/lib/prisma"

const requestResetSchema = z.object({
  email: z.string().email(),
})

function buildResetToken() {
  return crypto.randomBytes(32).toString("hex")
}

export const POST = withApiHandler(async (request: Request) => {
  const body = await request.json()
  const parsed = requestResetSchema.safeParse(body)

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid request body",
      400,
      parsed.error
    )
  }

  const email = parsed.data.email.trim().toLowerCase()
  const user = await prisma.userAuth.findUnique({
    where: { email },
    select: { id: true },
  })

  let token: string | null = null
  if (user) {
    token = buildResetToken()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    await prisma.userAuth.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpiresAt: expiresAt,
      },
    })
  }

  const isProd = process.env.NODE_ENV === "production"
  if (!isProd && token) {
    return NextResponse.json(ok({ requested: true, token }))
  }

  return NextResponse.json(ok({ requested: true }))
})
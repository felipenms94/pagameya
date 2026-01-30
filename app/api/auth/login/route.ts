import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { prisma } from "@/lib/prisma"
import {
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/auth/session"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const POST = withApiHandler(async (request: Request) => {
  const body = await request.json()
  const parsed = loginSchema.safeParse(body)

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
    select: {
      id: true,
      email: true,
      passwordHash: true,
      mustResetPassword: true,
    },
  })

  if (!user) {
    throw apiError(ERROR_CODES.UNAUTHORIZED, "Invalid credentials", 401)
  }

  if (user.mustResetPassword) {
    throw apiError(
      "PASSWORD_RESET_REQUIRED",
      "Debes cambiar tu contraseÃ±a",
      403
    )
  }

  const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!isValid) {
    throw apiError(ERROR_CODES.UNAUTHORIZED, "Invalid credentials", 401)
  }

  const token = createSessionToken(user.id, user.email)
  const response = NextResponse.json(
    ok({ user: { id: user.id, email: user.email } })
  )
  response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions())

  return response
})

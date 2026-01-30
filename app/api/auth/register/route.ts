import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { createUserAuth } from "@/lib/auth/createUserAuth"

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

  await createUserAuth({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  return NextResponse.json(ok({ created: true }))
})
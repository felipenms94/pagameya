import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError } from "@/lib/api/handler"
import { prisma } from "@/lib/prisma"

type CreateUserAuthInput = {
  email: string
  password: string
}

type CreateUserAuthOptions = {
  allowUpdate?: boolean
  prisma?: PrismaClient
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

async function buildPasswordHash(password: string) {
  return bcrypt.hash(password, 10)
}

export async function createUserAuth(
  input: CreateUserAuthInput,
  options?: CreateUserAuthOptions
) {
  const email = normalizeEmail(input.email)
  const passwordHash = await buildPasswordHash(input.password)
  const client = options?.prisma ?? prisma

  if (options?.allowUpdate) {
    return client.userAuth.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        mustResetPassword: false,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
      update: {
        passwordHash,
        mustResetPassword: false,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    })
  }

  const existing = await client.userAuth.findUnique({
    where: { email },
    select: { id: true },
  })
  if (existing) {
    throw apiError(ERROR_CODES.CONFLICT, "Email already in use", 409)
  }

  return client.userAuth.create({
    data: {
      email,
      passwordHash,
      mustResetPassword: false,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  })
}
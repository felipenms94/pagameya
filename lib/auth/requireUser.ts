import { ERROR_CODES } from "@/lib/api/errors"
import { apiError } from "@/lib/api/handler"
import { prisma } from "@/lib/prisma"
import {
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/auth/session"

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(";")
  for (const part of parts) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) {
      return rest.join("=")
    }
  }
  return null
}

export async function requireUser(request: Request) {
  const cookieHeader = request.headers.get("cookie")
  const token = getCookieValue(cookieHeader, getSessionCookieName())
  if (!token) {
    throw apiError(ERROR_CODES.UNAUTHORIZED, "Not authenticated", 401)
  }

  const payload = verifySessionToken(token)
  if (!payload) {
    throw apiError(ERROR_CODES.UNAUTHORIZED, "Invalid session", 401)
  }

  const user = await prisma.userAuth.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, createdAt: true },
  })

  if (!user) {
    throw apiError(ERROR_CODES.UNAUTHORIZED, "User not found", 401)
  }

  return user
}

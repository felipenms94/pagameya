import crypto from "crypto"

const SESSION_COOKIE = "auth_session"
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

type SessionPayload = {
  sub: string
  email: string
  exp: number
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV !== "production") {
    return "dev-auth-secret"
  }
  throw new Error("AUTH_SECRET is required")
}

function base64UrlEncode(value: string | Buffer) {
  const buffer = typeof value === "string" ? Buffer.from(value) : value
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
  const padLength = padded.length % 4
  const normalized =
    padLength === 0 ? padded : padded + "=".repeat(4 - padLength)
  return Buffer.from(normalized, "base64").toString("utf-8")
}

function sign(payload: string) {
  const digest = crypto
    .createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest()
  return base64UrlEncode(digest)
}

export function createSessionToken(userId: string, email: string) {
  const payload: SessionPayload = {
    sub: userId,
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }
  const payloadString = JSON.stringify(payload)
  const encoded = base64UrlEncode(payloadString)
  const signature = sign(encoded)
  return `${encoded}.${signature}`
}

export function verifySessionToken(token: string) {
  const [encoded, signature] = token.split(".")
  if (!encoded || !signature) return null

  const expected = sign(encoded)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null
  }

  let payload: SessionPayload
  try {
    payload = JSON.parse(base64UrlDecode(encoded)) as SessionPayload
  } catch {
    return null
  }

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null
  }

  return payload
}

export function getSessionCookieName() {
  return SESSION_COOKIE
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  }
}

export function getClearSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  }
}

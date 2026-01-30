import { NextResponse } from "next/server"

import { ok } from "@/lib/api/response"
import {
  getClearSessionCookieOptions,
  getSessionCookieName,
} from "@/lib/auth/session"

export async function POST() {
  const response = NextResponse.json(ok({ loggedOut: true }))
  response.cookies.set(
    getSessionCookieName(),
    "",
    getClearSessionCookieOptions()
  )
  return response
}

import { NextResponse } from "next/server"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { warnMissingEnv } from "@/lib/env"

export const runtime = "nodejs"

export const GET = withApiHandler(async (request: Request) => {
  warnMissingEnv(["CRON_SECRET"], "cron ping endpoint")
  const cronSecret = request.headers.get("x-cron-secret")
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    throw apiError(ERROR_CODES.UNAUTHORIZED, "Invalid cron secret", 401)
  }

  return NextResponse.json(ok({ ts: new Date().toISOString() }))
})

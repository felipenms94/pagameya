import { NextResponse } from "next/server"

import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { withApiHandler } from "@/lib/api/handler"

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  return NextResponse.json(ok({ user }))
})

import { NextResponse } from "next/server"

import { ok } from "@/lib/api/response"

export function GET() {
  return NextResponse.json(
    ok({ status: "ok", service: "cobros-deudas-backend" })
  )
}

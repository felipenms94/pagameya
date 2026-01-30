import { DebtDirection } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { GET as getAlerts } from "@/app/api/alerts/route"

type AlertKind =
  | "OVERDUE"
  | "DUE_TODAY"
  | "DUE_SOON"
  | "HIGH_PRIORITY"
  | "PROMISE_TODAY"

type AlertsResponse = {
  ok: true
  data: {
    workspaceId: string
    asOfLocalDate: string
    items: Array<{
      kind: AlertKind
      direction: DebtDirection
      debtId: string
      personId: string
      personName: string
      personPhone: string | null
      debtTitle: string
      balance: number
      dueDate: string | null
      promisedDate: string | null
    }>
  }
}

const querySchema = z.object({
  workspaceId: z.string().min(1),
  direction: z.nativeEnum(DebtDirection).optional(),
})

const toneByKind: Record<AlertKind, "soft" | "normal" | "strong"> = {
  OVERDUE: "normal",
  PROMISE_TODAY: "soft",
  DUE_TODAY: "soft",
  DUE_SOON: "soft",
  HIGH_PRIORITY: "strong",
}

function buildSuggestedId(
  kind: AlertKind,
  debtId: string,
  asOfLocalDate: string
) {
  return `${kind}:${debtId}:${asOfLocalDate}`
}

async function fetchAlertsFromRoute(
  request: Request,
  workspaceId: string,
  direction?: DebtDirection
) {
  const alertsUrl = new URL("/api/alerts", request.url)
  alertsUrl.searchParams.set("workspaceId", workspaceId)
  if (direction) {
    alertsUrl.searchParams.set("direction", direction)
  }

  const cookie = request.headers.get("cookie") ?? ""
  const alertsRequest = new Request(alertsUrl, {
    method: "GET",
    headers: cookie ? { cookie } : undefined,
  })

  const response = await getAlerts(alertsRequest, {} as unknown)
  if (!response.ok) {
    return response
  }

  const json = (await response.json()) as AlertsResponse
  return json
}

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    workspaceId: searchParams.get("workspaceId")?.trim(),
    direction: searchParams.get("direction")?.trim(),
  })

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "workspaceId is required",
      400,
      parsed.error
    )
  }

  const workspaceId = parsed.data.workspaceId
  const direction = parsed.data.direction

  await requireWorkspaceMember(prisma, user.id, workspaceId)

  const alertsResult = await fetchAlertsFromRoute(
    request,
    workspaceId,
    direction
  )

  if (alertsResult instanceof Response) {
    const errorBody = await alertsResult.json()
    return NextResponse.json(errorBody, { status: alertsResult.status })
  }

  const alertsItems = alertsResult.data.items
  const asOfLocalDate = alertsResult.data.asOfLocalDate

  const personIds = Array.from(new Set(alertsItems.map((item) => item.personId)))
  const persons = await prisma.person.findMany({
    where: {
      workspaceId,
      id: { in: personIds },
      deletedAt: null,
    },
    select: { id: true, email: true, phone: true },
  })
  const personById = new Map(persons.map((p) => [p.id, p]))

  const items = alertsItems.map((item) => {
    const person = personById.get(item.personId)
    const phone = person?.phone ?? item.personPhone ?? null
    const email = person?.email ?? null

    return {
      id: buildSuggestedId(item.kind, item.debtId, asOfLocalDate),
      kind: item.kind,
      direction: item.direction,
      debtId: item.debtId,
      personId: item.personId,
      personName: item.personName,
      personPhone: phone,
      debtTitle: item.debtTitle,
      balance: item.balance,
      dueDate: item.dueDate,
      promisedDate: item.promisedDate,
      recommendedTone: toneByKind[item.kind],
      channels: {
        whatsapp: Boolean(phone),
        email: Boolean(email),
        sms: Boolean(phone),
      },
    }
  })

  return NextResponse.json(
    ok({
      workspaceId,
      asOfLocalDate,
      items,
    })
  )
})

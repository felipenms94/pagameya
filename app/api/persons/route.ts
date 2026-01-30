import { NextResponse } from "next/server"
import { z } from "zod"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/services/activity"
import { createPersonSchema } from "@/lib/validators/person"

const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"])

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")?.trim()

  if (!workspaceId) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "workspaceId is required",
      400
    )
  }

  await requireWorkspaceMember(prisma, userId, workspaceId)

  const search = searchParams.get("search")?.trim()
  const tagFilter = searchParams.get("tag")?.trim()
  const priorityParam = searchParams.get("priority")?.trim()

  let priority: z.infer<typeof prioritySchema> | undefined
  if (priorityParam) {
    const parsedPriority = prioritySchema.safeParse(priorityParam)
    if (!parsedPriority.success) {
      throw apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid priority filter",
        400,
        parsedPriority.error
      )
    }
    priority = parsedPriority.data
  }

  const persons = await prisma.person.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(priority ? { priority } : {}),
      ...(tagFilter
        ? {
            tags: {
              some: {
                tagId: tagFilter,
                tag: { deletedAt: null },
              },
            },
          }
        : {}),
    },
    include: {
      tags: {
        where: { tag: { deletedAt: null } },
        include: { tag: true },
      },
    },
  })

  const data = persons.map((person) => ({
    id: person.id,
    workspaceId: person.workspaceId,
    name: person.name,
    phone: person.phone,
    email: person.email,
    priority: person.priority,
    notesInternal: person.notesInternal,
    isFavorite: person.isFavorite,
    createdAt: person.createdAt,
    tags: person.tags.map((personTag) => ({
      id: personTag.tag.id,
      name: personTag.tag.name,
      color: personTag.tag.color,
    })),
  }))

  return NextResponse.json(ok(data))
})

export const POST = withApiHandler(async (request: Request) => {
  const user = await requireUser(request)
  const userId = user.id
  const body = await request.json()
  const parsed = createPersonSchema.safeParse(body)

  if (!parsed.success) {
    throw apiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid request body",
      400,
      parsed.error
    )
  }

  await requireWorkspaceMember(prisma, userId, parsed.data.workspaceId)

  const person = await prisma.person.create({
    data: {
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      phone: parsed.data.phone ?? undefined,
      email: parsed.data.email ?? undefined,
      priority: parsed.data.priority ?? undefined,
      notesInternal: parsed.data.notesInternal ?? undefined,
      isFavorite: parsed.data.isFavorite ?? undefined,
    },
    include: {
      tags: {
        where: { tag: { deletedAt: null } },
        include: { tag: true },
      },
    },
  })

  await logActivity({
    workspaceId: parsed.data.workspaceId,
    userId,
    type: "PERSON_CREATED",
    personId: person.id,
  })

  const data = {
    id: person.id,
    workspaceId: person.workspaceId,
    name: person.name,
    phone: person.phone,
    email: person.email,
    priority: person.priority,
    notesInternal: person.notesInternal,
    isFavorite: person.isFavorite,
    createdAt: person.createdAt,
    tags: person.tags.map((personTag) => ({
      id: personTag.tag.id,
      name: personTag.tag.name,
      color: personTag.tag.color,
    })),
  }

  return NextResponse.json(ok(data))
})

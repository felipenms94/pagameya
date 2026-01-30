import { NextResponse } from "next/server"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/services/activity"
import { updatePersonSchema } from "@/lib/validators/person"

async function fetchPerson(workspaceId: string, personId: string) {
  return prisma.person.findFirst({
    where: { id: personId, workspaceId, deletedAt: null },
    include: {
      tags: {
        where: { tag: { deletedAt: null } },
        include: { tag: true },
      },
    },
  })
}

function toPersonDto(person: NonNullable<Awaited<ReturnType<typeof fetchPerson>>>) {
  return {
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
}

export const GET = withApiHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params
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

    const person = await fetchPerson(workspaceId, id)
    if (!person) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Person not found", 404)
    }

    return NextResponse.json(ok(toPersonDto(person)))
  }
)

export const PATCH = withApiHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params
    const user = await requireUser(request)
    const userId = user.id
    const body = await request.json()
    const parsed = updatePersonSchema.safeParse(body)

    if (!parsed.success) {
      throw apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid request body",
        400,
        parsed.error
      )
    }

    const { workspaceId, ...updates } = parsed.data

    await requireWorkspaceMember(prisma, userId, workspaceId)

    const existing = await fetchPerson(workspaceId, id)
    if (!existing) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Person not found", 404)
    }

    await prisma.person.update({
      where: { id: existing.id },
      data: {
        name: updates.name ?? undefined,
        phone: updates.phone ?? undefined,
        email: updates.email ?? undefined,
        priority: updates.priority ?? undefined,
        notesInternal: updates.notesInternal ?? undefined,
        isFavorite: updates.isFavorite ?? undefined,
      },
    })

    const updated = await fetchPerson(workspaceId, id)
    if (!updated) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Person not found", 404)
    }

    await logActivity({
      workspaceId,
      userId,
      type: "PERSON_UPDATED",
      personId: updated.id,
    })

    return NextResponse.json(ok(toPersonDto(updated)))
  }
)

export const DELETE = withApiHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params
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

    const existing = await fetchPerson(workspaceId, id)
    if (!existing) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Person not found", 404)
    }

    await prisma.person.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })

    await logActivity({
      workspaceId,
      userId,
      type: "PERSON_UPDATED",
      personId: existing.id,
      message: "Person deleted",
    })

    return NextResponse.json(ok({ id: existing.id }))
  }
)

import { NextResponse } from "next/server"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { ok } from "@/lib/api/response"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"

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

export const POST = withApiHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params
    const user = await requireUser(request)
    const userId = user.id
    const body = await request.json()
    const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : ""
    const tagId = typeof body?.tagId === "string" ? body.tagId : ""

    if (!workspaceId || !tagId) {
      throw apiError(
        ERROR_CODES.VALIDATION_ERROR,
        "workspaceId and tagId are required",
        400
      )
    }

    await requireWorkspaceMember(prisma, userId, workspaceId)

    const person = await fetchPerson(workspaceId, id)
    if (!person) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Person not found", 404)
    }

    const tag = await prisma.tag.findFirst({
      where: { id: tagId, workspaceId, deletedAt: null },
    })
    if (!tag) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Tag not found", 404)
    }

    await prisma.personTag.upsert({
      where: { personId_tagId: { personId: person.id, tagId } },
      create: { personId: person.id, tagId },
      update: {},
    })

    const updated = await fetchPerson(workspaceId, id)
    if (!updated) {
      throw apiError(ERROR_CODES.NOT_FOUND, "Person not found", 404)
    }

    return NextResponse.json(ok(toPersonDto(updated)))
  }
)

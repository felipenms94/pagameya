import * as XLSX from "xlsx"

import { ERROR_CODES } from "@/lib/api/errors"
import { apiError, withApiHandler } from "@/lib/api/handler"
import { requireUser } from "@/lib/auth/requireUser"
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember"
import { prisma } from "@/lib/prisma"

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

  const persons = await prisma.person.findMany({
    where: { workspaceId, deletedAt: null },
    include: {
      tags: {
        where: { tag: { deletedAt: null } },
        include: { tag: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const rows = persons.map((person) => ({
    createdAt: person.createdAt.toISOString(),
    name: person.name,
    phone: person.phone ?? "",
    email: person.email ?? "",
    priority: person.priority,
    tags: person.tags.map((personTag) => personTag.tag.name).join(", "),
  }))

  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: ["createdAt", "name", "phone", "email", "priority", "tags"],
  })
  XLSX.utils.book_append_sheet(workbook, sheet, "Persons")

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="persons.xlsx"',
    },
  })
})

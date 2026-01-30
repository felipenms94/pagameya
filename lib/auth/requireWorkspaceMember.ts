import type { PrismaClient } from "@prisma/client"
import { ERROR_CODES } from "@/lib/api/errors"
import { apiError } from "@/lib/api/handler"

export async function requireWorkspaceMember(
  prisma: PrismaClient,
  userId: string,
  workspaceId: string
) {
  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  if (!membership) {
    throw apiError(
      ERROR_CODES.FORBIDDEN,
      "No tienes acceso a este workspace.",
      403
    )
  }

  return membership;
}

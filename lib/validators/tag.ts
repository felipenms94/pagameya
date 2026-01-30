import { z } from "zod"

export const createTagSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  color: z.string().nullable().optional(),
})

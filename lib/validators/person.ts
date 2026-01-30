import { z } from "zod"

export const createPersonSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(2),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  notesInternal: z.string().nullable().optional(),
  isFavorite: z.boolean().optional(),
})

export const updatePersonSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(2).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  notesInternal: z.string().nullable().optional(),
  isFavorite: z.boolean().optional(),
})

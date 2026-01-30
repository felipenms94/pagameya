import { z } from "zod"

const directionSchema = z.enum(["RECEIVABLE", "PAYABLE"])
const typeSchema = z.enum(["CREDIT", "LOAN", "SERVICE", "OTHER"])
const interestPeriodSchema = z.enum(["MONTHLY"])

export const createDebtSchema = z.object({
  workspaceId: z.string().min(1),
  personId: z.string().min(1),
  direction: directionSchema,
  type: typeSchema.optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  currency: z.string().min(1).optional(),
  amountOriginal: z.number(),
  dueDate: z.string().datetime().nullable().optional(),
  issuedAt: z.string().datetime().nullable().optional(),
  hasInterest: z.boolean().optional(),
  interestRatePct: z.number().min(0).max(100).nullable().optional(),
  interestPeriod: interestPeriodSchema.nullable().optional(),
  minSuggestedPayment: z.number().nullable().optional(),
  splitCount: z.number().int().nullable().optional(),
  splitEach: z.number().nullable().optional(),
})

export const updateDebtSchema = z.object({
  workspaceId: z.string().min(1),
  personId: z.string().min(1).optional(),
  direction: directionSchema.optional(),
  type: typeSchema.optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  currency: z.string().min(1).optional(),
  amountOriginal: z.number().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  issuedAt: z.string().datetime().nullable().optional(),
  hasInterest: z.boolean().optional(),
  interestRatePct: z.number().min(0).max(100).nullable().optional(),
  interestPeriod: interestPeriodSchema.nullable().optional(),
  minSuggestedPayment: z.number().nullable().optional(),
  splitCount: z.number().int().nullable().optional(),
  splitEach: z.number().nullable().optional(),
})

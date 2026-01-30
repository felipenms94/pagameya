import { z } from "zod"

export const createPaymentSchema = z.object({
  workspaceId: z.string().min(1),
  amount: z.number(),
  paidAt: z.string().datetime().nullable().optional(),
  paymentTypeId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
})

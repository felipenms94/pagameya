import { PrismaClient } from "@prisma/client"
import { warnMissingEnv } from "@/lib/env"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

warnMissingEnv(["DATABASE_URL"], "Prisma client")
warnMissingEnv(["DIRECT_URL"], "Prisma client (migrations)")

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

-- Add password reset enforcement fields.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "mustResetPassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT,
  ADD COLUMN IF NOT EXISTS "passwordResetExpiresAt" TIMESTAMP(3);

-- Ensure the reset token is unique when present.
CREATE UNIQUE INDEX IF NOT EXISTS "User_passwordResetToken_key"
  ON "User"("passwordResetToken");

-- Heuristic backfill: any user with the known emergency hash must reset.
UPDATE "User"
SET "mustResetPassword" = true
WHERE "mustResetPassword" = false
  AND "passwordHash" = '$2a$10$lZloMIXwor6GTYTOYWgg8erq5Fv5V4gXzKXsQE0C2kgIK5MLyqk4m';
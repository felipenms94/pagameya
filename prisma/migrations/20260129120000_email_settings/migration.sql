DO $$ BEGIN
  CREATE TYPE "EmailRecipientMode" AS ENUM ('OWNERS', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "EmailSettings" (
  "workspaceId" TEXT NOT NULL,
  "dailyEnabled" BOOLEAN NOT NULL DEFAULT false,
  "dailyHourLocal" INTEGER NOT NULL DEFAULT 8,
  "weeklyEnabled" BOOLEAN NOT NULL DEFAULT false,
  "weeklyDayOfWeek" INTEGER NOT NULL DEFAULT 1,
  "weeklyHourLocal" INTEGER NOT NULL DEFAULT 8,
  "toMode" "EmailRecipientMode" NOT NULL DEFAULT 'OWNERS',
  "toEmails" JSONB,
  "timezone" TEXT NOT NULL DEFAULT 'America/Guayaquil',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("workspaceId")
);

DO $$ BEGIN
  ALTER TABLE "EmailSettings"
    ADD CONSTRAINT "EmailSettings_workspaceId_fkey"
    FOREIGN KEY ("workspaceId")
    REFERENCES "Workspace"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OutboundMessageStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OutboundMessageType" AS ENUM ('TEST', 'DAILY', 'WEEKLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OutboundMessageDirection" AS ENUM ('ALL', 'RECEIVABLE', 'PAYABLE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "OutboundMessageLog"
  ADD COLUMN IF NOT EXISTS "bodyPreview" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "type" "OutboundMessageType" NOT NULL DEFAULT 'TEST',
  ADD COLUMN IF NOT EXISTS "direction" "OutboundMessageDirection" NOT NULL DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);

UPDATE "OutboundMessageLog"
SET "bodyPreview" = LEFT("bodyText", 200)
WHERE "bodyPreview" = '';

UPDATE "OutboundMessageLog"
SET "sentAt" = "createdAt"
WHERE "status" = 'SENT' AND "sentAt" IS NULL;
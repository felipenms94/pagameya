-- Create enum for outbound message status.
CREATE TYPE "OutboundMessageStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- Create outbound message log table.
CREATE TABLE "OutboundMessageLog" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "channel" "ReminderChannel" NOT NULL,
  "to" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bodyText" TEXT NOT NULL,
  "bodyHtml" TEXT,
  "status" "OutboundMessageStatus" NOT NULL,
  "errorMessage" TEXT,
  "metaJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OutboundMessageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OutboundMessageLog_workspaceId_idx" ON "OutboundMessageLog"("workspaceId");

ALTER TABLE "OutboundMessageLog"
  ADD CONSTRAINT "OutboundMessageLog_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
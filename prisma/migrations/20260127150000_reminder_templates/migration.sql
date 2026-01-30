-- Create table for reminder templates per workspace.
CREATE TABLE "ReminderTemplate" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "channel" "ReminderChannel" NOT NULL,
  "tone" TEXT NOT NULL,
  "title" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ReminderTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReminderTemplate_workspaceId_idx" ON "ReminderTemplate"("workspaceId");

CREATE UNIQUE INDEX "ReminderTemplate_workspaceId_channel_tone_key"
  ON "ReminderTemplate"("workspaceId", "channel", "tone");

ALTER TABLE "ReminderTemplate"
  ADD CONSTRAINT "ReminderTemplate_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
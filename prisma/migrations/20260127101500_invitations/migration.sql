-- Backfill required password hashes before enforcing NOT NULL.
UPDATE "User"
SET "passwordHash" = '$2a$10$lZloMIXwor6GTYTOYWgg8erq5Fv5V4gXzKXsQE0C2kgIK5MLyqk4m'
WHERE "passwordHash" IS NULL;

-- Align the User table with the current Prisma schema.
ALTER TABLE "User" DROP COLUMN IF EXISTS "name";
ALTER TABLE "User" DROP COLUMN IF EXISTS "phone";
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;

-- Create the invitation status enum.
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- Create the Invitation table.
CREATE TABLE "Invitation" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
  "token" TEXT NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "invitedByUserId" TEXT NOT NULL,
  "acceptedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- Constraints and indexes.
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX "Invitation_workspaceId_idx" ON "Invitation"("workspaceId");
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_acceptedByUserId_fkey"
  FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
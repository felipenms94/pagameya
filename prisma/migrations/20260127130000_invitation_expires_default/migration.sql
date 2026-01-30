-- Set a database-level default for invitation expiration.
ALTER TABLE "Invitation"
  ALTER COLUMN "expiresAt" SET DEFAULT (now() + interval '7 days');
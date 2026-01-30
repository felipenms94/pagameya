/*
  Warnings:

  - The `interestPeriod` column on the `Debt` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "InterestPeriod" AS ENUM ('MONTHLY');

-- AlterTable
ALTER TABLE "Debt" DROP COLUMN "interestPeriod",
ADD COLUMN     "interestPeriod" "InterestPeriod";

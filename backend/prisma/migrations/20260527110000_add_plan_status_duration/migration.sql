-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "duration" TEXT NOT NULL DEFAULT 'medio',
                  ADD COLUMN "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE';

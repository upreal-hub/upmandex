-- CreateEnum
CREATE TYPE "UpmanDexVisibility" AS ENUM ('PUBLIC', 'HIDDEN');

-- CreateEnum
CREATE TYPE "UpmanAcquisitionMethod" AS ENUM ('EVENT_REDEEM', 'STREAM_COMMAND', 'SITE_SECRET', 'MANUAL');

-- CreateEnum
CREATE TYPE "UpmanAcquisitionResult" AS ENUM ('NEW', 'DUPLICATE');

-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'UPMAN_ACQUISITION_RESOLVED';

-- AlterTable
ALTER TABLE "Upman" ADD COLUMN "dexVisibility" "UpmanDexVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "UpmanEvent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpmanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpmanAcquisitionRule" (
    "id" TEXT NOT NULL,
    "upmanId" TEXT NOT NULL,
    "method" "UpmanAcquisitionMethod" NOT NULL,
    "externalKey" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "eventId" TEXT,
    "requiredTwitchCategoryId" TEXT,
    "siteSecretHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpmanAcquisitionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpmanAcquisitionGrant" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "userId" TEXT,
    "upmanId" TEXT NOT NULL,
    "twitchUserId" TEXT,
    "twitchLogin" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "result" "UpmanAcquisitionResult" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpmanAcquisitionGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UpmanEvent_slug_key" ON "UpmanEvent"("slug");

-- CreateIndex
CREATE INDEX "UpmanEvent_isEnabled_startsAt_endsAt_idx" ON "UpmanEvent"("isEnabled", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "UpmanAcquisitionRule_method_externalKey_key" ON "UpmanAcquisitionRule"("method", "externalKey");

-- CreateIndex
CREATE INDEX "UpmanAcquisitionRule_upmanId_idx" ON "UpmanAcquisitionRule"("upmanId");

-- CreateIndex
CREATE INDEX "UpmanAcquisitionRule_eventId_idx" ON "UpmanAcquisitionRule"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "UpmanAcquisitionGrant_idempotencyKey_key" ON "UpmanAcquisitionGrant"("idempotencyKey");

-- CreateIndex
CREATE INDEX "UpmanAcquisitionGrant_ruleId_createdAt_idx" ON "UpmanAcquisitionGrant"("ruleId", "createdAt");

-- CreateIndex
CREATE INDEX "UpmanAcquisitionGrant_userId_createdAt_idx" ON "UpmanAcquisitionGrant"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UpmanAcquisitionGrant_upmanId_createdAt_idx" ON "UpmanAcquisitionGrant"("upmanId", "createdAt");

-- AddForeignKey
ALTER TABLE "UpmanAcquisitionRule" ADD CONSTRAINT "UpmanAcquisitionRule_upmanId_fkey" FOREIGN KEY ("upmanId") REFERENCES "Upman"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpmanAcquisitionRule" ADD CONSTRAINT "UpmanAcquisitionRule_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "UpmanEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpmanAcquisitionGrant" ADD CONSTRAINT "UpmanAcquisitionGrant_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "UpmanAcquisitionRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpmanAcquisitionGrant" ADD CONSTRAINT "UpmanAcquisitionGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpmanAcquisitionGrant" ADD CONSTRAINT "UpmanAcquisitionGrant_upmanId_fkey" FOREIGN KEY ("upmanId") REFERENCES "Upman"("id") ON DELETE CASCADE ON UPDATE CASCADE;

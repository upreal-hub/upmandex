-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'PULL_RESOLVED';

-- CreateEnum
CREATE TYPE "PullResult" AS ENUM ('NEW', 'DUPLICATE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "twitchUserId" TEXT;

-- AlterTable
ALTER TABLE "Upman" ADD COLUMN "isPullable" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "PullRarityRule" (
    "rarity" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PullRarityRule_pkey" PRIMARY KEY ("rarity")
);

-- CreateTable
CREATE TABLE "PullEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "result" "PullResult" NOT NULL,
    "origin" "ActivityOrigin" NOT NULL DEFAULT 'STREAMERBOT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "twitchUserId" TEXT NOT NULL,
    "twitchLogin" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "upmanId" TEXT,
    "upmanSlug" TEXT NOT NULL,
    "upmanName" TEXT NOT NULL,
    "upmanRarity" TEXT NOT NULL,
    "upmanImage" TEXT NOT NULL,
    "upmanCreator" TEXT NOT NULL,

    CONSTRAINT "PullEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_twitchUserId_key" ON "User"("twitchUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PullEvent_requestId_key" ON "PullEvent"("requestId");

-- CreateIndex
CREATE INDEX "PullEvent_userId_createdAt_idx" ON "PullEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PullEvent_upmanId_createdAt_idx" ON "PullEvent"("upmanId", "createdAt");

-- CreateIndex
CREATE INDEX "PullEvent_origin_createdAt_idx" ON "PullEvent"("origin", "createdAt");

-- AddForeignKey
ALTER TABLE "PullEvent" ADD CONSTRAINT "PullEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullEvent" ADD CONSTRAINT "PullEvent_upmanId_fkey" FOREIGN KEY ("upmanId") REFERENCES "Upman"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed initial pull odds in basis points.
INSERT INTO "PullRarityRule" ("rarity", "weight", "enabled") VALUES
    ('Common', 6000, true),
    ('Rare', 2500, true),
    ('Epic', 1000, true),
    ('Mythic', 400, true),
    ('Legendary', 100, true);

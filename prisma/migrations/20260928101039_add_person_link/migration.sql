-- CreateEnum
CREATE TYPE "PersonLinkPlatform" AS ENUM ('YOUTUBE', 'INSTAGRAM', 'TIKTOK', 'BLUESKY', 'X', 'GITHUB', 'WEBSITE', 'PORTFOLIO');

-- CreateTable
CREATE TABLE "PersonLink" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "platform" "PersonLinkPlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonLink_personId_position_idx" ON "PersonLink"("personId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PersonLink_personId_platform_key" ON "PersonLink"("personId", "platform");

-- AddForeignKey
ALTER TABLE "PersonLink" ADD CONSTRAINT "PersonLink_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

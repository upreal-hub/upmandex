-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'PERSON_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE 'PERSON_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'UPMAN_RELATIONSHIPS_UPDATED';

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "userId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Upman" ADD COLUMN "creatorPersonId" TEXT,
ADD COLUMN "representedPersonId" TEXT;

-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN "personId" TEXT,
ADD COLUMN "personDisplayName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Person_userId_key" ON "Person"("userId");

-- CreateIndex
CREATE INDEX "Person_displayName_idx" ON "Person"("displayName");

-- CreateIndex
CREATE INDEX "Upman_creatorPersonId_idx" ON "Upman"("creatorPersonId");

-- CreateIndex
CREATE INDEX "Upman_representedPersonId_idx" ON "Upman"("representedPersonId");

-- CreateIndex
CREATE INDEX "ActivityLog_personId_createdAt_idx" ON "ActivityLog"("personId", "createdAt");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upman" ADD CONSTRAINT "Upman_creatorPersonId_fkey" FOREIGN KEY ("creatorPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upman" ADD CONSTRAINT "Upman_representedPersonId_fkey" FOREIGN KEY ("representedPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

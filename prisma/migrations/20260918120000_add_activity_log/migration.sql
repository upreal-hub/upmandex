-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('UPMAN_GRANTED', 'UPMAN_REMOVED', 'UPMAN_CREATED', 'UPMAN_UPDATED', 'UPMAN_DELETED');

-- CreateEnum
CREATE TYPE "ActivityOrigin" AS ENUM ('ADMIN', 'STREAMERBOT', 'IMPORT', 'SYSTEM');

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "origin" "ActivityOrigin" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "actorLogin" TEXT,
    "targetUserId" TEXT,
    "targetLogin" TEXT,
    "upmanId" TEXT,
    "upmanSlug" TEXT,
    "upmanName" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_id_idx" ON "ActivityLog"("createdAt", "id");

-- CreateIndex
CREATE INDEX "ActivityLog_action_createdAt_idx" ON "ActivityLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_origin_createdAt_idx" ON "ActivityLog"("origin", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_actorUserId_createdAt_idx" ON "ActivityLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_targetUserId_createdAt_idx" ON "ActivityLog"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_upmanId_createdAt_idx" ON "ActivityLog"("upmanId", "createdAt");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_upmanId_fkey" FOREIGN KEY ("upmanId") REFERENCES "Upman"("id") ON DELETE SET NULL ON UPDATE CASCADE;

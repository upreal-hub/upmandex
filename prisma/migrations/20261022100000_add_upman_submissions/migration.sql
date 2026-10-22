CREATE TYPE "UpmanSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "UpmanSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "contentFingerprint" TEXT NOT NULL,
    "status" "UpmanSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "rarity" TEXT,
    "represent" BOOLEAN NOT NULL DEFAULT false,
    "approvedUpmanId" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpmanSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UpmanSubmission_approvedUpmanId_key" ON "UpmanSubmission"("approvedUpmanId");
CREATE UNIQUE INDEX "UpmanSubmission_userId_contentFingerprint_key" ON "UpmanSubmission"("userId", "contentFingerprint");
CREATE INDEX "UpmanSubmission_userId_status_createdAt_idx" ON "UpmanSubmission"("userId", "status", "createdAt");
CREATE INDEX "UpmanSubmission_status_createdAt_idx" ON "UpmanSubmission"("status", "createdAt");

ALTER TABLE "UpmanSubmission" ADD CONSTRAINT "UpmanSubmission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UpmanSubmission" ADD CONSTRAINT "UpmanSubmission_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UpmanSubmission" ADD CONSTRAINT "UpmanSubmission_approvedUpmanId_fkey"
  FOREIGN KEY ("approvedUpmanId") REFERENCES "Upman"("id") ON DELETE SET NULL ON UPDATE CASCADE;

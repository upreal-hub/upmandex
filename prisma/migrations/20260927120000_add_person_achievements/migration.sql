-- Persistent achievement unlocks belong to canonical People. Definitions remain
-- versioned in application code; this table records only earned milestones.
CREATE TABLE "PersonAchievement" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "achievementKey" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonAchievement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PersonAchievement_personId_achievementKey_key"
ON "PersonAchievement"("personId", "achievementKey");

CREATE INDEX "PersonAchievement_personId_unlockedAt_idx"
ON "PersonAchievement"("personId", "unlockedAt");

ALTER TABLE "PersonAchievement"
ADD CONSTRAINT "PersonAchievement_personId_fkey"
FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

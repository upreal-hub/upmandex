CREATE TYPE "TwitchAchievementEventKind" AS ENUM ('CHECK_IN', 'GARTIC_PARTICIPATION');

CREATE TABLE "TwitchAchievementEvent" (
  "id" TEXT NOT NULL,
  "kind" "TwitchAchievementEventKind" NOT NULL,
  "redemptionId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "twitchUserId" TEXT NOT NULL,
  "twitchLogin" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TwitchAchievementEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TwitchAchievementEvent_redemptionId_key" ON "TwitchAchievementEvent"("redemptionId");
CREATE UNIQUE INDEX "TwitchAchievementEvent_userId_kind_sessionId_key" ON "TwitchAchievementEvent"("userId", "kind", "sessionId");
CREATE INDEX "TwitchAchievementEvent_userId_kind_createdAt_idx" ON "TwitchAchievementEvent"("userId", "kind", "createdAt");
ALTER TABLE "TwitchAchievementEvent" ADD CONSTRAINT "TwitchAchievementEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

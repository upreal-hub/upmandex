-- CHECK_IN redemptions are idempotent through redemptionId and do not have a session.
-- GARTIC_PARTICIPATION continues to require a session in application validation.
ALTER TABLE "TwitchAchievementEvent" ALTER COLUMN "sessionId" DROP NOT NULL;

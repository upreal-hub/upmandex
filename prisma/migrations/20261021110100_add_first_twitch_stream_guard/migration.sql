-- Only one viewer can claim First! for a real Twitch stream, regardless of concurrency.
CREATE UNIQUE INDEX "TwitchAchievementEvent_first_stream_unique"
  ON "TwitchAchievementEvent" ("sessionId")
  WHERE "kind" = 'FIRST';

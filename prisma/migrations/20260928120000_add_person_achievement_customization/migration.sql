ALTER TABLE "Person"
  ADD COLUMN "equippedTitleAchievementKey" TEXT,
  ADD COLUMN "featuredAchievementKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

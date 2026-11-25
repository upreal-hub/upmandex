CREATE TABLE "GarticFeud" (
  "id" TEXT PRIMARY KEY CHECK ("id" = 'anniversary'),
  "revision" INTEGER NOT NULL CHECK ("revision" >= 0),
  "state" JSONB NOT NULL
);

-- Prepared locally only. Requires explicit approval before applying to any database.
CREATE TABLE "SitePublication" (
  "id" TEXT PRIMARY KEY CHECK ("id" = 'anniversary'),
  "status" TEXT NOT NULL DEFAULT 'PRIVATE' CHECK ("status" IN ('PRIVATE', 'PUBLIC')),
  "version" INTEGER NOT NULL DEFAULT 0 CHECK ("version" >= 0),
  "history" JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof("history") = 'array'),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "SitePublication" ("id") VALUES ('anniversary');

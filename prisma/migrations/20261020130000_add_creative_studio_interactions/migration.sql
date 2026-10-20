-- Additive Creative Studio interactions. Existing publications remain intact;
-- downloads are opt-in for every existing and future artwork.
ALTER TABLE "PersonArtwork"
ADD COLUMN "allowDownloads" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "PersonArtworkLike" (
  "userId" TEXT NOT NULL,
  "artworkId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PersonArtworkLike_pkey" PRIMARY KEY ("userId", "artworkId")
);

CREATE TABLE "PersonProjectLike" (
  "userId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PersonProjectLike_pkey" PRIMARY KEY ("userId", "projectId")
);

ALTER TABLE "PersonArtworkLike"
ADD CONSTRAINT "PersonArtworkLike_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PersonArtworkLike"
ADD CONSTRAINT "PersonArtworkLike_artworkId_fkey"
FOREIGN KEY ("artworkId") REFERENCES "PersonArtwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PersonProjectLike"
ADD CONSTRAINT "PersonProjectLike_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PersonProjectLike"
ADD CONSTRAINT "PersonProjectLike_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "PersonProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "PersonArtworkLike_artworkId_createdAt_idx" ON "PersonArtworkLike"("artworkId", "createdAt");
CREATE INDEX "PersonProjectLike_projectId_createdAt_idx" ON "PersonProjectLike"("projectId", "createdAt");

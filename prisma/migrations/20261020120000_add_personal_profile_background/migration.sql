-- A personal asset is owned by one authenticated User. Existing global
-- cosmetics remain owner-less, so their historical equipment stays intact.
ALTER TABLE "ProfileCosmeticAsset"
ADD COLUMN "ownerUserId" TEXT;

ALTER TABLE "ProfileCosmeticAsset"
ADD CONSTRAINT "ProfileCosmeticAsset_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ProfileCosmeticAsset_ownerUserId_idx"
ON "ProfileCosmeticAsset"("ownerUserId");

-- PostgreSQL permits several NULL values here, preserving the shared catalog,
-- while allowing at most one personal asset of each type per User.
CREATE UNIQUE INDEX "ProfileCosmeticAsset_ownerUserId_type_key"
ON "ProfileCosmeticAsset"("ownerUserId", "type");

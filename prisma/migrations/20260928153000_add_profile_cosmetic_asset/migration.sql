-- CreateEnum
CREATE TYPE "ProfileCosmeticAssetType" AS ENUM ('BACKGROUND', 'BANNER');

-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'PROFILE_COSMETIC_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE 'PROFILE_COSMETIC_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'PROFILE_COSMETIC_DELETED';

-- CreateTable
CREATE TABLE "ProfileCosmeticAsset" (
    "id" TEXT NOT NULL,
    "type" "ProfileCosmeticAssetType" NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileCosmeticAsset_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Person" ADD COLUMN "equippedCustomBackgroundId" TEXT;
ALTER TABLE "Person" ADD COLUMN "equippedCustomBannerId" TEXT;

-- CreateIndex
CREATE INDEX "ProfileCosmeticAsset_type_createdAt_idx" ON "ProfileCosmeticAsset"("type", "createdAt");
CREATE INDEX "Person_equippedCustomBackgroundId_idx" ON "Person"("equippedCustomBackgroundId");
CREATE INDEX "Person_equippedCustomBannerId_idx" ON "Person"("equippedCustomBannerId");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_equippedCustomBackgroundId_fkey" FOREIGN KEY ("equippedCustomBackgroundId") REFERENCES "ProfileCosmeticAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Person" ADD CONSTRAINT "Person_equippedCustomBannerId_fkey" FOREIGN KEY ("equippedCustomBannerId") REFERENCES "ProfileCosmeticAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

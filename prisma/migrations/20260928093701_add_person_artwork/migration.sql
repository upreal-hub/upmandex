-- CreateTable
CREATE TABLE "PersonArtwork" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "title" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonArtwork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonArtwork_personId_position_idx" ON "PersonArtwork"("personId", "position");

-- AddForeignKey
ALTER TABLE "PersonArtwork" ADD CONSTRAINT "PersonArtwork_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

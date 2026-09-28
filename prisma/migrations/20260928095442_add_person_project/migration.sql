-- CreateTable
CREATE TABLE "PersonProject" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonProject_personId_position_idx" ON "PersonProject"("personId", "position");

-- AddForeignKey
ALTER TABLE "PersonProject" ADD CONSTRAINT "PersonProject_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

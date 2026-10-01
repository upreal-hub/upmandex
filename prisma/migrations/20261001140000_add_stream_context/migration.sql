-- CreateTable
CREATE TABLE "StreamContext" (
    "id" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "twitchCategoryId" TEXT,
    "twitchCategoryName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreamContext_pkey" PRIMARY KEY ("id")
);

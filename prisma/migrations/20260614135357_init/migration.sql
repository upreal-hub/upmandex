-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "twitchLogin" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upman" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "creator" TEXT NOT NULL,
    "creatorTwitch" TEXT,
    "ownersCount" INTEGER NOT NULL DEFAULT 0,
    "firstOwner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "upmanId" TEXT NOT NULL,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_twitchLogin_key" ON "User"("twitchLogin");

-- CreateIndex
CREATE UNIQUE INDEX "Upman_slug_key" ON "Upman"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_userId_upmanId_key" ON "Inventory"("userId", "upmanId");

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_upmanId_fkey" FOREIGN KEY ("upmanId") REFERENCES "Upman"("id") ON DELETE CASCADE ON UPDATE CASCADE;

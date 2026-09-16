-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

-- Bootstrap the existing administrator used by the application before roles.
UPDATE "User"
SET "role" = 'ADMIN'
WHERE LOWER("twitchLogin") = 'upreal_';

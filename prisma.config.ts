import { existsSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";
import { defineConfig } from "prisma/config";

const localEnvPath = path.resolve(process.cwd(), ".env.local");
const isVercel = process.env.VERCEL === "1";
const isAnniversaryPreview =
  isVercel &&
  process.env.VERCEL_ENV === "preview" &&
  process.env.UPMANDEX_ENV === "anniversary";

if (isVercel) {
  if (!isAnniversaryPreview) {
    throw new Error(
      "Prisma is restricted to the UPMANDEX anniversary Vercel Preview environment."
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for the anniversary Vercel Preview build.");
  }
} else {
  if (!existsSync(localEnvPath)) {
    throw new Error("Prisma requires .env.local for the anniversary development workflow.");
  }

  config({ path: localEnvPath, override: true });

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in .env.local.");
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});

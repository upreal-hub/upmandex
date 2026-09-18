import { existsSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";
import { defineConfig } from "prisma/config";

const localEnvPath = path.resolve(process.cwd(), ".env.local");

if (!existsSync(localEnvPath)) {
  throw new Error("Prisma requires .env.local for the anniversary development workflow.");
}

config({ path: localEnvPath, override: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in .env.local.");
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

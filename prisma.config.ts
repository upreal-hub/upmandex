import { existsSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { verifyAdminTestPreview } from "./lib/admin-test-preview";
import { checkPrismaEnvironment } from "./lib/prisma-build-policy";

const localEnvPath = path.resolve(process.cwd(), ".env.local");
const isVercel = process.env.VERCEL === "1";
const generating = process.argv[2] === "generate";
checkPrismaEnvironment(process.env, process.argv[2]);

if (isVercel && !generating) {
  verifyAdminTestPreview(process.env);

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for the anniversary Vercel Preview build.");
  }
} else if (!isVercel) {
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

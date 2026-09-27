import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads .env on its own. packages/db/.env is the developer's
// link to the root env file, as the test setup expects; CI and the migrate
// workflow set the variables in the environment and have no file.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --env-file-if-exists=.env prisma/seed.ts",
  },
  datasource: {
    // The CLI only migrates, and DDL needs a real session: the direct
    // connection, never the transaction pooler behind DATABASE_URL. Read
    // without env() so that `prisma generate`, which connects to nothing, still
    // runs where no database is configured (the install, the lint job).
    url: process.env.DIRECT_URL ?? "",
  },
});

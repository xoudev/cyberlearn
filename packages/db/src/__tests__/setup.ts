// Load .env before tests run (Node 22 built-in - no dotenv dependency needed)
// packages/db/.env is a symlink to the monorepo root .env.local
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

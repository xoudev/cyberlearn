// Load .env before tests run (Node 22 built-in - no dotenv dependency needed)
// packages/db/.env is a symlink to the monorepo root .env.local
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
const databaseUrl = process.env["DATABASE_URL"] ?? "";
const isLocalSupabase = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/u.test(supabaseUrl);
const isLocalDatabase = /@(127\.0\.0\.1|localhost)(:\d+)?\//u.test(databaseUrl);

// Unit-test runs must never mutate a hosted project through a developer .env.
// CI provisions an ephemeral local Supabase stack and therefore keeps these
// variables. An explicit override remains available for isolated test projects.
if (
  process.env["ALLOW_REMOTE_INTEGRATION_TESTS"] !== "true" &&
  (!isLocalSupabase || !isLocalDatabase)
) {
  delete process.env["NEXT_PUBLIC_SUPABASE_URL"];
  delete process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
  delete process.env["DATABASE_URL"];
  delete process.env["DIRECT_URL"];
}

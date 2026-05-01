/**
 * Deletes ALL users from Supabase Auth + cascades to public.users and related data.
 * Dev only. Run with: pnpm tsx scripts/reset-users.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../apps/web/.env.local") });

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function resetUsers() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  if (data.users.length === 0) {
    console.log("No users found.");
    return;
  }

  console.log(`Deleting ${data.users.length} user(s)...`);

  for (const user of data.users) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error(`Failed to delete ${user.email ?? user.id}: ${deleteError.message}`);
    } else {
      console.log(`  ✓ ${user.email ?? user.id}`);
    }
  }

  console.log("Done. All users and related data deleted.");
}

resetUsers().catch((err) => {
  console.error(err);
  process.exit(1);
});

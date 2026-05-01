import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../apps/web/.env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const [k, ...v] = l.split("=");
      return [k.trim(), v.join("=").trim().replace(/^"|"$/g, "")];
    }),
);

const url = env["NEXT_PUBLIC_SUPABASE_URL"];
const key = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!url || !key) {
  console.error("Missing env vars");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" };

const res = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers });
const { users } = await res.json();

if (!users?.length) {
  console.log("No users found.");
  process.exit(0);
}

console.log(`Deleting ${users.length} user(s)...`);
for (const user of users) {
  const r = await fetch(`${url}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers });
  console.log(r.ok ? `  ✓ ${user.email ?? user.id}` : `  ✗ ${user.email ?? user.id}: ${r.status}`);
}
console.log("Done.");

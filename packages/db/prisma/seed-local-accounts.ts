/**
 * Local stack only - creates the test accounts used to walk through the site
 * and the console by hand (docs/dev/local-stack.md).
 *
 * Run with: pnpm --filter @cyberlearn/db db:seed-local-accounts
 * Current TOTP code of the MFA account: pnpm --filter @cyberlearn/db db:seed-local-accounts --code
 *
 * It refuses to run unless both the database and Supabase are on a loopback
 * address: it sets passwords and roles, which must never reach a real project.
 * The password below is a fixed test value of the disposable local stack, like
 * the anon and service_role keys `supabase start` prints.
 */

import { createHmac } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createPrismaClient } from "../src/prisma.js";

const LOCAL_PASSWORD = "cyberlearn-local-dev-2026";
const TOTP_FILE = join(tmpdir(), "cyberlearn-local-totp.json");
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

type Role = "STUDENT" | "TEACHER" | "ADMIN";

interface LocalAccount {
  email: string;
  username: string;
  displayName: string;
  role: Role;
  mfa?: boolean;
  banned?: boolean;
}

const ACCOUNTS: readonly LocalAccount[] = [
  { email: "eleve@cyberlearn.test", username: "eleve", displayName: "Élève Test", role: "STUDENT" },
  {
    email: "eleve-mfa@cyberlearn.test",
    username: "eleve-mfa",
    displayName: "Élève Double Facteur",
    role: "STUDENT",
    mfa: true,
  },
  { email: "prof@cyberlearn.test", username: "prof", displayName: "Prof Test", role: "TEACHER" },
  // The console requires a second factor, so both admins come with one.
  {
    email: "admin@cyberlearn.test",
    username: "admin-local",
    displayName: "Admin Local",
    role: "ADMIN",
    mfa: true,
  },
  {
    email: "admin2@cyberlearn.test",
    username: "admin-second",
    displayName: "Admin Second",
    role: "ADMIN",
    mfa: true,
  },
  { email: "ami-a@cyberlearn.test", username: "ami-a", displayName: "Ami A", role: "STUDENT" },
  { email: "ami-b@cyberlearn.test", username: "ami-b", displayName: "Ami B", role: "STUDENT" },
  {
    email: "banni@cyberlearn.test",
    username: "banni",
    displayName: "Compte Banni",
    role: "STUDENT",
    banned: true,
  },
];

const FRIENDS: readonly [string, string][] = [["ami-a@cyberlearn.test", "ami-b@cyberlearn.test"]];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function assertLoopback(name: string): string {
  const value = requireEnv(name);
  const host = new URL(value).hostname;
  if (!LOOPBACK.has(host)) {
    throw new Error(`${name} points at ${host}: this script only runs against the local stack`);
  }
  return value;
}

/** RFC 4648 base32, the encoding of a TOTP secret. */
function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of input.replace(/=+$/u, "").toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** RFC 6238 code for the current 30-second step: six digits, HMAC-SHA1. */
function totpCode(secret: string, now = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const digest = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, "0");
}

function readSecrets(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(readFileSync(TOTP_FILE, "utf8"));
    if (typeof parsed !== "object" || parsed === null) return {};
    const secrets: Record<string, string> = {};
    for (const [email, secret] of Object.entries(parsed)) {
      if (typeof secret === "string") secrets[email] = secret;
    }
    return secrets;
  } catch {
    return {};
  }
}

async function findAuthUserId(admin: SupabaseClient, email: string): Promise<string | null> {
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((user) => user.email === email);
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
}

async function ensureAuthUser(admin: SupabaseClient, account: LocalAccount): Promise<string> {
  const attributes = {
    password: LOCAL_PASSWORD,
    email_confirm: true,
    app_metadata: { onboarding_complete: true },
  };
  const existing = await findAuthUserId(admin, account.email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing, attributes);
    if (error) throw error;
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    ...attributes,
  });
  if (error) throw error;
  return data.user.id;
}

/** Enrols and verifies a TOTP factor, then keeps its secret for --code. */
async function ensureTotp(
  admin: SupabaseClient,
  supabaseUrl: string,
  anonKey: string,
  userId: string,
  email: string,
  secrets: Record<string, string>,
): Promise<void> {
  const { data: factors, error: listError } = await admin.auth.admin.mfa.listFactors({ userId });
  if (listError) throw listError;
  const verified = factors.factors.some((factor) => factor.status === "verified");
  if (verified && secrets[email]) return;
  // A factor whose secret was lost cannot produce codes any more: start over.
  for (const factor of factors.factors) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
    if (error) throw error;
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password: LOCAL_PASSWORD });
  if (signIn.error) throw signIn.error;
  const enrol = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "local" });
  if (enrol.error) throw enrol.error;
  const challenge = await client.auth.mfa.challenge({ factorId: enrol.data.id });
  if (challenge.error) throw challenge.error;
  const verify = await client.auth.mfa.verify({
    factorId: enrol.data.id,
    challengeId: challenge.data.id,
    code: totpCode(enrol.data.totp.secret),
  });
  if (verify.error) throw verify.error;
  secrets[email] = enrol.data.totp.secret;
}

async function printCode(): Promise<void> {
  const email = process.argv[3] ?? "eleve-mfa@cyberlearn.test";
  const secret = readSecrets()[email];
  if (!secret) {
    console.error(`No TOTP secret for ${email}: run the seed first`);
    process.exit(1);
  }
  const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
  console.log(`${totpCode(secret)} (valid ${String(remaining)} s)`);
}

async function main(): Promise<void> {
  if (process.argv[2] === "--code") return printCode();

  assertLoopback("DATABASE_URL");
  const supabaseUrl = assertLoopback("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const admin = createClient(supabaseUrl, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const prisma = createPrismaClient();
  const secrets = readSecrets();
  const ids = new Map<string, string>();

  try {
    for (const account of ACCOUNTS) {
      const id = await ensureAuthUser(admin, account);
      ids.set(account.email, id);
      await prisma.user.upsert({
        where: { id },
        create: {
          id,
          email: account.email,
          username: account.username,
          displayName: account.displayName,
          role: account.role,
        },
        update: {
          username: account.username,
          displayName: account.displayName,
          role: account.role,
        },
      });
      if (account.mfa) await ensureTotp(admin, supabaseUrl, anonKey, id, account.email, secrets);
    }

    const issuer = ids.get("admin@cyberlearn.test");
    for (const account of ACCOUNTS.filter((candidate) => candidate.banned)) {
      const userId = ids.get(account.email);
      if (!userId) continue;
      const active = await prisma.userBan.findFirst({ where: { userId, liftedAt: null } });
      if (!active) {
        await prisma.userBan.create({
          data: {
            userId,
            reason: "Compte de test banni sur la pile locale.",
            issuedById: issuer ?? null,
          },
        });
      }
    }

    for (const [first, second] of FRIENDS) {
      const a = ids.get(first);
      const b = ids.get(second);
      if (!a || !b) continue;
      const [userAId, userBId] = a < b ? [a, b] : [b, a];
      await prisma.friendship.upsert({
        where: { userAId_userBId: { userAId, userBId } },
        create: {
          userAId,
          userBId,
          requestedById: userAId,
          status: "ACCEPTED",
          respondedAt: new Date(),
        },
        update: { status: "ACCEPTED", respondedAt: new Date() },
      });
    }

    writeFileSync(TOTP_FILE, JSON.stringify(secrets, null, 2));
    console.log(
      `✅ ${String(ACCOUNTS.length)} local accounts ready (TOTP secrets in ${TOTP_FILE})`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

/**
 * Break-glass - removes the TOTP factors of one account, so that its owner can
 * sign in with the password and enrol a new authenticator.
 * Run with: pnpm --filter @cyberlearn/db db:reset-mfa <email>
 *
 * For the operator who holds the service role key: an admin who lost their
 * phone cannot pass the console's TOTP step, and nothing inside the console
 * can lift it for them. Asks for the address to be typed again before acting,
 * and writes an audit_logs row (docs/authentication.md, "Lost authenticator").
 *
 * Needs DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { createInterface } from "node:readline/promises";
import { authEmailSchema } from "@cyberlearn/types";
import {
  listTotpFactors,
  type MfaResetResult,
  mfaResetAuditData,
  removeFactors,
  unrecordedResetNotice,
} from "../src/auth/reset-mfa.js";
import { createPrismaClient } from "../src/prisma.js";
import { createSupabaseAdminClient } from "../src/supabase/admin.js";

const prisma = createPrismaClient();

async function confirm(email: string): Promise<boolean> {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question("Type the e-mail address again to confirm: ");
    return answer.trim().toLowerCase() === email;
  } finally {
    prompt.close();
  }
}

/**
 * Writes the audit row of a reset that has already run. Returns why it could
 * not, or null: by now the factors are deleted, so a database failure is
 * reported as such instead of surfacing as "Reset failed".
 */
async function recordReset(userId: string, result: MfaResetResult): Promise<string | null> {
  try {
    await prisma.auditLog.create({ data: mfaResetAuditData(userId, result) });
    return null;
  } catch (e: unknown) {
    return e instanceof Error ? e.message : String(e);
  }
}

async function main() {
  const parsed = authEmailSchema.safeParse(process.argv[2]);
  if (!parsed.success) {
    console.error("Usage: pnpm --filter @cyberlearn/db db:reset-mfa <email>");
    process.exit(1);
  }
  const email = parsed.data;
  if (!process.stdin.isTTY) {
    console.error("This script asks for a typed confirmation: run it from a terminal.");
    process.exit(1);
  }

  // Also proves the database answers before anything is deleted: a wrong
  // DATABASE_URL stops here, not after the factors are gone.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });
  if (!user) {
    console.error("No user found with the specified email");
    process.exit(1);
  }

  const mfa = createSupabaseAdminClient().auth.admin.mfa;
  const factors = await listTotpFactors(mfa, user.id);
  // RGPD-compliant logging (docs/security/logging.md): the internal UUID only,
  // never the address.
  console.log(`Account ${user.id} (${user.role}): ${String(factors.length)} TOTP factor(s).`);
  if (factors.length === 0) {
    console.log("Nothing to remove.");
    return;
  }
  console.log("Removing them signs the account out everywhere; its next sign-in enrols again.");

  if (!(await confirm(email))) {
    console.error("The address does not match. Nothing was changed.");
    process.exit(1);
  }

  const result = await removeFactors(
    mfa,
    user.id,
    factors.map((factor) => factor.id),
  );
  const resetAt = new Date();
  const auditFailure = await recordReset(user.id, result);

  console.log(`✅ ${String(result.removed.length)} factor(s) removed`);
  for (const failure of result.failed) {
    console.error(`   - ${failure.id} was not removed: ${failure.message}`);
  }
  if (auditFailure !== null) {
    console.error(unrecordedResetNotice(user.id, result, resetAt, auditFailure));
    process.exit(1);
  }
  if (result.failed.length > 0) process.exit(1);
}

main()
  .catch((e: unknown) => {
    console.error("❌ Reset failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

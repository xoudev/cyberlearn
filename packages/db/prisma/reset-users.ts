/**
 * One-shot ACCOUNT wipe - deletes user accounts and every trace of their data,
 * to restart from a clean base before launch.
 *
 * For each targeted account it:
 *   1. Hard-deletes the public.users row. Prisma cascades the per-user tables
 *      (preferences, lesson/path/challenge progress, hint reveals, badges,
 *      review schedules, notifications, skip waivers, quiz attempts,
 *      placement result, account deletion tokens).
 *   2. Removes the rows that the schema only SET NULL on delete (certificates,
 *      ratings, lesson questions/answers, contact tickets) so no anonymized
 *      residue is left behind.
 *   3. Deletes the matching Supabase Auth account (auth.users) via the service
 *      role, so the person can no longer log in. Skipped with a warning if
 *      SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL are not in the env.
 *
 * Keeps: the content (lessons, paths, challenges - use db:reset-content for
 * those), the badge catalog, and the placement questions.
 *
 * By default ADMIN accounts are PRESERVED (so you keep access to the admin
 * panel). Pass --include-admins to wipe them too.
 *
 * DRY-RUN by default. Run with:
 *   pnpm --filter @cyberlearn/db db:reset-users                    (report only)
 *   pnpm --filter @cyberlearn/db db:reset-users --apply           (delete, keep admins)
 *   pnpm --filter @cyberlearn/db db:reset-users --apply --include-admins
 */

import { PrismaClient } from "@prisma/client";
import { createSupabaseAdminClient } from "../src/supabase/admin";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const includeAdmins = process.argv.includes("--include-admins");

async function main(): Promise<void> {
  const where = includeAdmins ? {} : { role: { not: "ADMIN" as const } };

  const targets = await prisma.user.findMany({ where, select: { id: true, role: true } });
  const ids = targets.map((u) => u.id);
  const totalUsers = await prisma.user.count();
  const preservedAdmins = includeAdmins
    ? 0
    : await prisma.user.count({ where: { role: "ADMIN" } });

  console.log(apply ? "== APPLY MODE ==" : "== DRY RUN (pass --apply to delete) ==");
  console.log(`Accounts in DB: ${String(totalUsers)}`);
  console.log(
    `Targeted for deletion: ${String(ids.length)}${includeAdmins ? " (admins INCLUDED)" : ` (preserving ${String(preservedAdmins)} admin account(s))`}`,
  );

  if (ids.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  if (!apply) {
    console.log("Re-run with --apply to perform the deletion.");
    console.log(
      "Add --include-admins to also wipe admin accounts (you would lose admin-panel access).",
    );
    return;
  }

  // 1. Hard delete the user rows. Cascade handles dependent tables; SET NULL
  //    relations (certificates, ratings, Q&A, contact tickets) get nulled.
  const deletedUsers = await prisma.user.deleteMany({ where: { id: { in: ids } } });

  // 2. Remove the now-orphaned anonymized rows for a truly clean slate.
  //    Answers reference questions, so delete answers before questions.
  const answers = await prisma.lessonAnswer.deleteMany({ where: { userId: null } });
  const questions = await prisma.lessonQuestion.deleteMany({ where: { userId: null } });
  const ratings = await prisma.rating.deleteMany({ where: { userId: null } });
  const certificates = await prisma.certificate.deleteMany({ where: { userId: null } });
  const tickets = await prisma.contactTicket.deleteMany({ where: { userId: null } });

  console.log("Prisma deletion done:", {
    users: deletedUsers.count,
    lessonAnswers: answers.count,
    lessonQuestions: questions.count,
    ratings: ratings.count,
    certificates: certificates.count,
    contactTickets: tickets.count,
  });

  // 3. Delete the Supabase Auth accounts so they can no longer authenticate.
  let admin: ReturnType<typeof createSupabaseAdminClient> | null = null;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    admin = null;
  }

  if (!admin) {
    console.warn(
      "\n⚠ Supabase admin client unavailable (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing).",
    );
    console.warn(
      "  The app database is wiped, but the auth.users accounts still exist. Set those env vars and re-run,",
    );
    console.warn("  or delete the auth users from the Supabase dashboard.");
    return;
  }

  let authDeleted = 0;
  const authErrors: string[] = [];
  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) authErrors.push(`${id}: ${error.message}`);
    else authDeleted++;
  }

  console.log(`Supabase Auth accounts deleted: ${String(authDeleted)}/${String(ids.length)}`);
  if (authErrors.length > 0) {
    console.warn(`Auth deletion errors (${String(authErrors.length)}):`);
    for (const e of authErrors.slice(0, 20)) console.warn(`  - ${e}`);
  }
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());

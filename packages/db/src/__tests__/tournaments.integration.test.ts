/**
 * Who reads a tournament over the Data API: the policies of
 * 20261008180000_tournaments, against the real database.
 *
 * Prisma connects as the table owner and bypasses RLS, so the service's own
 * scoping (tournament.repository.ts) is what keeps a stranger out on the site
 * and in the app. These policies are the second line, for a client talking to
 * Supabase directly, and they lean on a SECURITY DEFINER helper: the case
 * worth proving is that they answer with rows, not with "infinite recursion".
 *
 * Skips gracefully without a local Supabase stack, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const TEST_PASSWORD = "TestPassword123!";
const suffix = randomUUID().slice(0, 8);

const EMAILS = {
  member: `tournoi-eleve-${suffix}@test.cyberlearn.internal`,
  teacher: `tournoi-prof-${suffix}@test.cyberlearn.internal`,
  stranger: `tournoi-autre-${suffix}@test.cyberlearn.internal`,
} as const;
type Who = keyof typeof EMAILS;

const establishmentId = randomUUID();
const promotionId = randomUUID();
const classId = randomUUID();
const challengeId = randomUUID();
const running = randomUUID();
const upcoming = randomUUID();

describe("tournaments RLS (integration)", () => {
  let supabaseUrl = "";
  let supabaseAnonKey = "";
  let admin: SupabaseClient | null = null;
  let configured = false;
  const ids: Record<Who, string> = { member: "", teacher: "", stranger: "" };

  async function insert(table: string, rows: Record<string, unknown> | Record<string, unknown>[]) {
    if (admin === null) throw new Error("no admin client");
    const { error } = await admin.from(table).insert(rows);
    if (error) throw new Error(`insert into ${table}: ${error.message}`);
  }

  async function signInAs(who: Who): Promise<SupabaseClient> {
    // A throwaway client signs in, then the token rides on a fresh one: see
    // rls.integration.test.ts for why the signing client is not reused.
    const signer = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await signer.auth.signInWithPassword({
      email: EMAILS[who],
      password: TEST_PASSWORD,
    });
    if (error || !data.session) throw new Error(`Sign in failed: ${error?.message}`);
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
  }

  beforeAll(async () => {
    supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
    supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) return;

    admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // SAFETY: EMAILS is a literal object, so its keys are exactly the Who union.
    for (const who of Object.keys(EMAILS) as Who[]) {
      const { data, error } = await admin.auth.admin.createUser({
        email: EMAILS[who],
        password: TEST_PASSWORD,
        email_confirm: true,
      });
      if (error || !data.user) throw new Error(`Failed to create ${who}: ${error?.message}`);
      ids[who] = data.user.id;
    }

    // updatedAt is NOT NULL without a default: Prisma fills it, not Postgres.
    const now = new Date().toISOString();
    const hour = 3_600_000;
    await insert("users", [
      { id: ids.member, email: EMAILS.member, displayName: "Élève", updatedAt: now },
      { id: ids.teacher, email: EMAILS.teacher, displayName: "Prof", updatedAt: now },
      { id: ids.stranger, email: EMAILS.stranger, displayName: "Autre", updatedAt: now },
    ]);
    await insert("establishments", {
      id: establishmentId,
      name: `Lycée ${suffix}`,
      slug: `lycee-tournoi-${suffix}`,
      updatedAt: now,
    });
    await insert("promotions", {
      id: promotionId,
      establishmentId,
      name: `BTS ${suffix}`,
      slug: `bts-${suffix}`,
      updatedAt: now,
    });
    await insert("classes", {
      id: classId,
      promotionId,
      name: `SIO1-${suffix}`,
      slug: `sio1-${suffix}`,
      updatedAt: now,
    });
    await insert("class_members", { classId, userId: ids.member });
    await insert("class_teachers", { classId, teacherId: ids.teacher });
    // Inactive: a tournament's own challenge, out of the catalogue the other
    // specs read.
    await insert("challenges", {
      id: challengeId,
      refCode: `CL-CHG-T${suffix}`,
      slug: `tournoi-${suffix}`,
      title: "Défi de tournoi",
      description: "Pour les tests RLS.",
      instructions: "# Test",
      category: "CYBERSEC",
      difficulty: "BEGINNER",
      type: "CTF",
      xpReward: 0,
      flag: "CL{rls}",
      isActive: false,
      updatedAt: now,
    });
    await insert("tournaments", [
      {
        id: running,
        title: `Tournoi ${suffix}`,
        startsAt: new Date(Date.now() - hour).toISOString(),
        endsAt: new Date(Date.now() + hour).toISOString(),
        updatedAt: now,
      },
      {
        id: upcoming,
        title: `À venir ${suffix}`,
        startsAt: new Date(Date.now() + 24 * hour).toISOString(),
        endsAt: new Date(Date.now() + 26 * hour).toISOString(),
        updatedAt: now,
      },
    ]);
    await insert("tournament_classes", [
      { tournamentId: running, classId },
      { tournamentId: upcoming, classId },
    ]);
    await insert("tournament_challenges", [
      { tournamentId: running, challengeId, points: 100 },
      { tournamentId: upcoming, challengeId, points: 100 },
    ]);
    await insert("tournament_solves", {
      id: randomUUID(),
      tournamentId: running,
      challengeId,
      userId: ids.member,
      classId,
      points: 100,
    });

    configured = true;
  });

  afterAll(async () => {
    if (admin === null) return;
    // The tournaments first: their challenge is RESTRICTed while they hold it.
    // The class tree cascades from the establishment, the users go last.
    await admin.from("tournaments").delete().in("id", [running, upcoming]);
    await admin.from("challenges").delete().eq("id", challengeId);
    await admin.from("establishments").delete().eq("id", establishmentId);
    const created = Object.values(ids).filter((id) => id !== "");
    await admin.from("users").delete().in("id", created);
    for (const id of created) await admin.auth.admin.deleteUser(id);
  });

  it("a member reads the tournament, its classes, its challenges once started, and their solve", async () => {
    if (!configured) return;
    const member = await signInAs("member");

    const tournaments = await member.from("tournaments").select("id").in("id", [running, upcoming]);
    expect(tournaments.error).toBeNull();
    expect((tournaments.data ?? []).map((r: { id: string }) => r.id).sort()).toEqual(
      [running, upcoming].sort(),
    );

    const classes = await member
      .from("tournament_classes")
      .select("classId")
      .eq("tournamentId", running);
    expect(classes.error).toBeNull();
    expect(classes.data).toEqual([{ classId }]);

    // The upcoming one keeps its challenges to itself until it starts.
    const challenges = await member
      .from("tournament_challenges")
      .select("tournamentId")
      .in("tournamentId", [running, upcoming]);
    expect(challenges.error).toBeNull();
    expect(challenges.data).toEqual([{ tournamentId: running }]);

    const solves = await member
      .from("tournament_solves")
      .select("userId")
      .eq("tournamentId", running);
    expect(solves.error).toBeNull();
    expect(solves.data).toEqual([{ userId: ids.member }]);
  });

  it("a teacher of a class reads the tournament, not who found which flag", async () => {
    if (!configured) return;
    const teacher = await signInAs("teacher");
    const tournaments = await teacher.from("tournaments").select("id").eq("id", running);
    expect(tournaments.error).toBeNull();
    expect(tournaments.data).toEqual([{ id: running }]);
    const solves = await teacher
      .from("tournament_solves")
      .select("userId")
      .eq("tournamentId", running);
    expect(solves.error).toBeNull();
    expect(solves.data).toEqual([]);
  });

  it("someone in none of its classes reads none of it", async () => {
    if (!configured) return;
    const stranger = await signInAs("stranger");
    for (const [table, column] of [
      ["tournaments", "id"],
      ["tournament_classes", "tournamentId"],
      ["tournament_challenges", "tournamentId"],
      ["tournament_solves", "tournamentId"],
    ] as const) {
      const { data, error } = await stranger.from(table).select(column).eq(column, running);
      expect(error).toBeNull();
      expect(data).toEqual([]);
    }
  });

  it("nobody reads which admin composed it, and no client records a flag", async () => {
    if (!configured) return;
    const member = await signInAs("member");
    const author = await member.from("tournaments").select("createdById").eq("id", running);
    expect(author.error).not.toBeNull();

    const forged = await member.from("tournament_solves").insert({
      id: randomUUID(),
      tournamentId: running,
      challengeId,
      userId: ids.member,
      classId,
      points: 1000,
    });
    expect(forged.error).not.toBeNull();
  });

  it("anon reads nothing", async () => {
    if (!configured) return;
    const anon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data } = await anon.from("tournaments").select("id").eq("id", running);
    expect(data ?? []).toEqual([]);
  });
});

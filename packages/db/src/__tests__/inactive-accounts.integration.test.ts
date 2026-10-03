/**
 * Who is warned, who is erased, and the link that stops it, against real rows.
 *
 * The queries compare two columns of the same row (a notice counts only if it
 * is newer than the last activity), which a mocked client cannot check. A
 * mistake here erases somebody who came back, or nobody at all.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll; results
 * are read for this suite's accounts only, with a limit high enough to reach
 * them whatever else the database holds.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import {
  findAccountsToErase,
  findAccountsToWarn,
  keepAccountByToken,
} from "../rgpd/inactive-accounts.js";
import { monthsBefore } from "../rgpd/retention.js";

const suffix = randomUUID().slice(0, 8);
const NOW = new Date();
const DAY = 24 * 60 * 60 * 1000;
const STARTED = new Date();

const twoYearsAgo = monthsBefore(NOW, 24);
const ACCOUNTS = {
  // Inactive two years and a day, never warned: warned now.
  silent: { lastActiveAt: new Date(twoYearsAgo.getTime() - DAY), notice: null },
  // Inactive two years and a day, warned 31 days ago: erased now.
  warnedLongAgo: {
    lastActiveAt: new Date(twoYearsAgo.getTime() - DAY),
    notice: new Date(NOW.getTime() - 31 * DAY),
  },
  // Warned 10 days ago: neither, the notice is still running.
  warnedRecently: {
    lastActiveAt: new Date(twoYearsAgo.getTime() - DAY),
    notice: new Date(NOW.getTime() - 10 * DAY),
  },
  // Came back after a notice, then went quiet again: the old notice is void,
  // so warned afresh and not erased.
  cameBack: {
    lastActiveAt: new Date(twoYearsAgo.getTime() + 15 * DAY),
    notice: monthsBefore(NOW, 25),
  },
  // Active last month: neither.
  active: { lastActiveAt: monthsBefore(NOW, 1), notice: null },
  // An administrator, however quiet: neither.
  admin: { lastActiveAt: new Date(twoYearsAgo.getTime() - 60 * DAY), notice: null },
} as const;

type Name = keyof typeof ACCOUNTS;
const ids = Object.fromEntries(
  (Object.keys(ACCOUNTS) as Name[]).map((name) => [name, randomUUID()]),
) as Record<Name, string>;
const OURS = new Set(Object.values(ids));

let configured = false;

function namesOf(rows: { id: string }[]): string[] {
  const byId = new Map(Object.entries(ids).map(([name, id]) => [id, name]));
  return rows
    .filter((r) => OURS.has(r.id))
    .map((r) => byId.get(r.id) ?? "?")
    .sort();
}

describe("inactive accounts (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;
    for (const [name, spec] of Object.entries(ACCOUNTS) as [Name, (typeof ACCOUNTS)[Name]][]) {
      await prisma.user.create({
        data: {
          id: ids[name],
          email: `ia-${name}-${suffix}@t.internal`,
          username: `ia${name.slice(0, 8)}${suffix}`,
          displayName: name,
          role: name === "admin" ? "ADMIN" : "STUDENT",
          lastActiveAt: spec.lastActiveAt,
          inactivityNoticeAt: spec.notice,
        },
      });
    }
    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.auditLog.deleteMany({
      where: { action: "user.account.kept", createdAt: { gte: STARTED } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [...OURS] } } });
  });

  it("warns the quiet accounts not yet warned since their last activity", async () => {
    if (!configured) return;
    expect(namesOf(await findAccountsToWarn(NOW, 10_000))).toEqual(["cameBack", "silent"]);
  });

  it("erases only the accounts warned at least thirty days ago and silent since", async () => {
    if (!configured) return;
    expect(namesOf(await findAccountsToErase(NOW, 10_000))).toEqual(["warnedLongAgo"]);
  });

  it("keeps an account from its link, once", async () => {
    if (!configured) return;
    const hash = `keep-${suffix}`;
    await prisma.user.update({
      where: { id: ids.warnedLongAgo },
      data: { inactivityKeepTokenHash: hash },
    });

    await expect(keepAccountByToken(hash, NOW)).resolves.toBe(ids.warnedLongAgo);
    const kept = await prisma.user.findUniqueOrThrow({
      where: { id: ids.warnedLongAgo },
      select: { lastActiveAt: true, inactivityNoticeAt: true, inactivityKeepTokenHash: true },
    });
    expect(kept).toEqual({
      lastActiveAt: NOW,
      inactivityNoticeAt: null,
      inactivityKeepTokenHash: null,
    });
    expect(namesOf(await findAccountsToErase(NOW, 10_000))).toEqual([]);

    await expect(keepAccountByToken(hash, NOW)).resolves.toBeNull();
  });
});

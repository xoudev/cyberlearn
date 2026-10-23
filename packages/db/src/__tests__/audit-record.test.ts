/**
 * The console's audit actions, named in one place, and the one way an entry
 * is written. Prisma is mocked: what this checks is which client writes (the
 * transaction's when there is one, so the change and its trace land
 * together) and that an entry reaches the table as the gesture described it.
 */

import type { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUDIT_ACTION, CONSOLE_AUDIT_ACTIONS } from "../audit-actions.js";
import { auditLogRepository } from "../repositories/audit-log.repository.js";
import { BADGE_GRANT_ACTION, BADGE_REVOKE_ACTION } from "../repositories/badge.repository.js";
import { CERTIFICATE_AUDIT_ACTION } from "../repositories/certificate.repository.js";
import { CONTENT_AUDIT_ACTION } from "../repositories/content-moderation.repository.js";
import { LESSON_CORRECTION_ACTION } from "../repositories/lesson-progress.repository.js";
import { PLACEMENT_RESET_ACTION } from "../repositories/placement.repository.js";
import { EXAM_COOLDOWN_WAIVED_ACTION } from "../repositories/quiz.repository.js";
import { STREAK_CORRECTION_ACTION } from "../repositories/streak.repository.js";
import { TICKET_ASSIGN_ACTION, TICKET_NOTE_ACTION } from "../repositories/ticket.repository.js";
import { TOURNAMENT_SOLVE_AUDIT_ACTION } from "../repositories/tournament.repository.js";
import { CONSOLE_PROFILE_ACTION } from "../repositories/user.repository.js";
import { XP_ADJUSTMENT_ACTION } from "../xp/adjust.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { auditLog: { create: vi.fn() } },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const ACTOR = "11111111-1111-4111-8111-111111111111";
const TARGET = "22222222-2222-4222-8222-222222222222";

/** Every name of the catalogue, with where it sits in it. */
function everyName(): { key: string; name: string }[] {
  return Object.entries(AUDIT_ACTION).flatMap(([group, names]) =>
    Object.entries(names).map(([key, name]) => ({ key: `${group}.${key}`, name })),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.auditLog.create.mockResolvedValue({});
});

describe("AUDIT_ACTION", () => {
  it("gives each gesture a name of its own", () => {
    // Two keys on one name would merge two gestures in the journal's filter.
    const seen = new Map<string, string>();
    for (const { key, name } of everyName()) {
      expect(seen.get(name), `${key} repeats ${name}`).toBeUndefined();
      seen.set(name, key);
    }
  });

  it("spells every name the way the journal stores and filters them", () => {
    for (const { key, name } of everyName()) {
      // audit_logs.action is a VARCHAR(100); the console's filter accepts
      // dotted lowercase words.
      expect(name.length, key).toBeLessThanOrEqual(100);
      expect(name, key).toMatch(/^[a-z_]+(\.[a-z_]+)+$/u);
    }
  });

  it("lists every one of them for the filter, sorted", () => {
    expect([...CONSOLE_AUDIT_ACTIONS].sort()).toEqual(
      everyName()
        .map(({ name }) => name)
        .sort(),
    );
    expect(CONSOLE_AUDIT_ACTIONS).toEqual([...CONSOLE_AUDIT_ACTIONS].sort());
  });

  it("is what the repositories' own constants read", () => {
    expect(BADGE_GRANT_ACTION).toBe(AUDIT_ACTION.user.badgeGrant);
    expect(BADGE_REVOKE_ACTION).toBe(AUDIT_ACTION.user.badgeRevoke);
    expect(LESSON_CORRECTION_ACTION).toBe(AUDIT_ACTION.user.lessonProgressCorrect);
    expect(PLACEMENT_RESET_ACTION).toBe(AUDIT_ACTION.user.placementReset);
    expect(EXAM_COOLDOWN_WAIVED_ACTION).toBe(AUDIT_ACTION.user.examCooldownWaived);
    expect(STREAK_CORRECTION_ACTION).toBe(AUDIT_ACTION.user.streakCorrect);
    expect(XP_ADJUSTMENT_ACTION).toBe(AUDIT_ACTION.user.xpAdjust);
    expect(TICKET_ASSIGN_ACTION).toBe(AUDIT_ACTION.ticket.assign);
    expect(TICKET_NOTE_ACTION).toBe(AUDIT_ACTION.ticket.noteAdd);
    expect(CERTIFICATE_AUDIT_ACTION).toBe(AUDIT_ACTION.certificate);
    expect(CONTENT_AUDIT_ACTION).toBe(AUDIT_ACTION.content);
    expect(TOURNAMENT_SOLVE_AUDIT_ACTION).toBe(AUDIT_ACTION.tournamentSolve);
    expect(CONSOLE_PROFILE_ACTION).toEqual({
      update: AUDIT_ACTION.user.profileUpdate,
      reset: AUDIT_ACTION.user.profileReset,
      sessionsRevoked: AUDIT_ACTION.user.sessionsRevoked,
    });
  });

  it("keeps the names rows were already written under", () => {
    // Renaming one would hide every row written before from its filter, and
    // the role history from the second-factor guard that reads it back.
    expect(AUDIT_ACTION.user.roleUpdate).toBe("user.role.update");
    expect(AUDIT_ACTION.user.banLifted).toBe("admin.user.ban_lifted");
    expect(AUDIT_ACTION.user.mfaReset).toBe("admin.user.mfa_reset");
    expect(AUDIT_ACTION.ticket.statusUpdate).toBe("ticket.status.update");
    expect(AUDIT_ACTION.audit.export).toBe("admin.audit.export");
    expect(AUDIT_ACTION.announcement.send).toBe("announcement.send");
    // The import page wrote these two itself before they joined the catalogue.
    expect(AUDIT_ACTION.lesson.importRateLimited).toBe("lesson.import.rate_limited");
    expect(AUDIT_ACTION.lesson.importRejected).toBe("lesson.import.rejected");
  });
});

describe("auditLogRepository.record", () => {
  it("writes the entry on its own when it is handed no transaction", async () => {
    await auditLogRepository.record({
      actorId: ACTOR,
      action: AUDIT_ACTION.user.passwordResetSent,
      targetType: "User",
      targetId: TARGET,
    });

    // Nothing invented: no metadata given, none written, and the column
    // stays null as it did when the console wrote the row itself.
    expect(mockPrisma.auditLog.create).toHaveBeenCalledExactlyOnceWith({
      data: {
        actorId: ACTOR,
        action: "admin.user.password_reset_sent",
        targetType: "User",
        targetId: TARGET,
      },
    });
  });

  it("writes in the transaction it is handed, and not beside it", async () => {
    const tx = { auditLog: { create: vi.fn().mockResolvedValue({}) } };
    await auditLogRepository.record(
      {
        actorId: ACTOR,
        action: AUDIT_ACTION.path.status,
        targetType: "Path",
        targetId: TARGET,
        metadata: { from: "DRAFT", to: "PUBLISHED" },
      },
      // SAFETY: the fake implements the one table of Prisma.TransactionClient
      // this write touches.
      tx as unknown as Prisma.TransactionClient,
    );

    expect(tx.auditLog.create).toHaveBeenCalledExactlyOnceWith({
      data: {
        actorId: ACTOR,
        action: "path.status",
        targetType: "Path",
        targetId: TARGET,
        metadata: { from: "DRAFT", to: "PUBLISHED" },
      },
    });
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("writes an entry about an erased account as erased", async () => {
    await auditLogRepository.record({
      actorId: ACTOR,
      actorHashedId: "hashed",
      action: AUDIT_ACTION.user.deletionNoticeFailed,
      targetType: "user",
      targetId: "hashed",
      anonymized: true,
      metadata: { error: "mailbox full" },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: ACTOR,
        actorHashedId: "hashed",
        action: "admin.user.deleted.notice_failed",
        targetType: "user",
        targetId: "hashed",
        anonymized: true,
        metadata: { error: "mailbox full" },
      },
    });
  });

  it("writes a gesture on nothing in particular with no target id", async () => {
    await auditLogRepository.record({
      actorId: ACTOR,
      action: AUDIT_ACTION.audit.export,
      targetType: "AuditLog",
      targetId: null,
      metadata: { rows: 2 },
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: ACTOR,
        action: "admin.audit.export",
        targetType: "AuditLog",
        targetId: null,
        metadata: { rows: 2 },
      },
    });
  });

  it("lets a failed write reach the caller, who decides what it means", async () => {
    mockPrisma.auditLog.create.mockRejectedValue(new Error("audit_logs unavailable"));
    await expect(
      auditLogRepository.record({
        actorId: ACTOR,
        action: AUDIT_ACTION.ticket.reply,
        targetType: "ContactTicket",
        targetId: TARGET,
        metadata: {},
      }),
    ).rejects.toThrow("audit_logs unavailable");
  });
});

describe("auditLogRepository.contentGesturesOnAuthor", () => {
  it("finds the gestures on an account's contents by the author the entry keeps", async () => {
    const find = vi.fn().mockResolvedValue([{ id: "e-1" }]);
    const count = vi.fn().mockResolvedValue(3);
    Object.assign(mockPrisma.auditLog, { findMany: find, count });

    const result = await auditLogRepository.contentGesturesOnAuthor(TARGET, 5);

    // Hide, restore and delete carry the author; the dismissal of reports does not.
    const where = {
      action: {
        in: [AUDIT_ACTION.content.hide, AUDIT_ACTION.content.restore, AUDIT_ACTION.content.delete],
      },
      metadata: { path: ["authorId"], equals: TARGET },
    };
    expect(count).toHaveBeenCalledWith({ where });
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ where, take: 5, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
    );
    expect(result).toEqual({ total: 3, rows: [{ id: "e-1" }] });
  });
});

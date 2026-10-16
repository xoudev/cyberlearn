import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn<() => Promise<{ id: string }>>(),
  challengeCreate: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  challengeFindUnique: vi.fn<(args: unknown) => Promise<Record<string, unknown> | null>>(),
  challengeUpdate: vi.fn<(args: unknown) => Promise<unknown>>(),
  challengeDelete: vi.fn<(args: unknown) => Promise<unknown>>(),
  progressCount: vi.fn<(args: unknown) => Promise<number>>(),
  hintCreate: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  hintUpdate: vi.fn<(args: unknown) => Promise<{ challengeId: string }>>(),
  hintDelete: vi.fn<(args: unknown) => Promise<{ challengeId: string }>>(),
  auditCreate: vi.fn<(args: { data: Record<string, unknown> }) => Promise<unknown>>(),
  isUsed: vi.fn<(id: string) => Promise<boolean>>(),
  revalidatePath: vi.fn<(path: string) => void>(),
  redirect: vi.fn<(url: string) => never>(),
}));

/** The database, and the client a transaction hands its callback: the same calls. */
const client = vi.hoisted(() => {
  const db = {
    challenge: {
      create: m.challengeCreate,
      findUnique: m.challengeFindUnique,
      update: m.challengeUpdate,
      delete: m.challengeDelete,
    },
    challengeHint: { create: m.hintCreate, update: m.hintUpdate, delete: m.hintDelete },
    userChallengeProgress: { count: m.progressCount },
    auditLog: { create: m.auditCreate },
    $transaction: (work: (tx: unknown) => Promise<unknown>): Promise<unknown> => work(db),
  };
  return db;
});

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  prisma: client,
  JSON_NULL_IN_DB: "DbNull",
  tournamentRepository: { isUsed: m.isUsed },
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));

const {
  createChallengeAction,
  createHintAction,
  deleteChallengeAction,
  deleteHintAction,
  setChallengeActiveAction,
  updateChallengeAction,
  updateHintAction,
} = await import("../challenge-admin-actions");

/**
 * Every change made to a challenge from the console goes to the audit log, in
 * the transaction that makes it. None of them did: a flag could be changed, a
 * challenge switched off or deleted, and /audit?target=<id> had nothing.
 */

const ID = "88888888-8888-4888-8888-888888888888";
const HINT = "99999999-9999-4999-8999-999999999999";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

const FIELDS = {
  refCode: "CL-CHL-001",
  slug: "le-journal",
  title: "Le journal",
  description: "Retrouve le flag dans le journal.",
  instructions: "Lis le journal.",
  category: "CYBERSEC",
  difficulty: "BEGINNER",
  type: "CTF",
  xpReward: "100",
  timeLimitMin: "0",
  maxAttempts: "3",
  flag: "CL{nouveau}",
  orderIndex: "0",
};

/** The row as the database holds it before the edit. */
const STORED = {
  refCode: "CL-CHL-001",
  slug: "le-journal",
  title: "Le journal",
  description: "Retrouve le flag dans le journal.",
  instructions: "Lis le journal.",
  category: "CYBERSEC",
  difficulty: "BEGINNER",
  type: "CTF",
  xpReward: 100,
  timeLimitMin: 0,
  maxAttempts: 3,
  flag: "CL{ancien}",
  machine: null,
  starterCode: null,
  orderIndex: 0,
  prerequisiteId: null,
  attachmentUrl: null,
  resourceUrl: null,
};

function audited(): Record<string, unknown> | undefined {
  return m.auditCreate.mock.calls[0]?.[0].data;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: "admin-1" });
  m.challengeCreate.mockResolvedValue({ id: ID });
  m.challengeFindUnique.mockResolvedValue(STORED);
  m.challengeUpdate.mockResolvedValue({});
  m.challengeDelete.mockResolvedValue({});
  m.progressCount.mockResolvedValue(0);
  m.isUsed.mockResolvedValue(false);
  m.hintCreate.mockResolvedValue({ id: HINT });
  m.hintUpdate.mockResolvedValue({ challengeId: ID });
  m.hintDelete.mockResolvedValue({ challengeId: ID });
  m.auditCreate.mockResolvedValue({});
  m.redirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
});

describe("the challenge itself", () => {
  it("logs a creation, without the flag", async () => {
    await expect(createChallengeAction({}, form(FIELDS))).rejects.toThrow(
      `NEXT_REDIRECT:/challenges/${ID}/edit`,
    );
    expect(audited()).toMatchObject({
      actorId: "admin-1",
      action: "challenge.create",
      targetType: "Challenge",
      targetId: ID,
    });
    expect(JSON.stringify(audited())).not.toContain("CL{");
  });

  it("logs which fields an edit changed, the flag by name and never by value", async () => {
    await expect(updateChallengeAction(ID, {}, form(FIELDS))).resolves.toEqual({});
    expect(audited()).toMatchObject({
      action: "challenge.update",
      targetId: ID,
      metadata: { changed: ["flag"] },
    });
    expect(JSON.stringify(audited())).not.toMatch(/ancien|nouveau/u);
  });

  it("says when the challenge is gone, and logs nothing", async () => {
    m.challengeFindUnique.mockResolvedValue(null);
    const result = await updateChallengeAction(ID, {}, form(FIELDS));
    expect(result.error).toMatch(/n'existe plus/u);
    expect(m.challengeUpdate).not.toHaveBeenCalled();
    expect(m.auditCreate).not.toHaveBeenCalled();
  });

  it.each([true, false])("logs switching it %s", async (isActive) => {
    await setChallengeActiveAction(ID, isActive);
    expect(audited()).toMatchObject({
      action: "challenge.active.update",
      targetId: ID,
      metadata: { isActive },
    });
  });

  it("logs a deletion with what the challenge was called", async () => {
    m.challengeFindUnique.mockResolvedValue({ refCode: "CL-CHL-001", title: "Le journal" });
    await expect(deleteChallengeAction(ID)).rejects.toThrow("NEXT_REDIRECT:/challenges");
    expect(m.challengeDelete).toHaveBeenCalledWith({ where: { id: ID } });
    expect(audited()).toMatchObject({
      action: "challenge.delete",
      targetId: ID,
      metadata: { refCode: "CL-CHL-001", title: "Le journal" },
    });
  });

  it("logs nothing when a deletion is refused", async () => {
    m.challengeFindUnique.mockResolvedValue({ refCode: "CL-CHL-001", title: "Le journal" });
    m.progressCount.mockResolvedValue(4);
    const result = await deleteChallengeAction(ID);
    expect(result.error).toMatch(/4 progression/u);
    expect(m.auditCreate).not.toHaveBeenCalled();
  });
});

describe("its hints", () => {
  it("logs them under the challenge, so its audit trail shows them", async () => {
    await createHintAction(ID, "Regarde la date.", 10, 0);
    await updateHintAction(HINT, "Regarde l'heure.", 20);
    await deleteHintAction(HINT);

    const rows = m.auditCreate.mock.calls.map(([args]) => args.data);
    expect(rows.map((row) => row.action)).toEqual([
      "challenge.hint.create",
      "challenge.hint.update",
      "challenge.hint.delete",
    ]);
    for (const row of rows) {
      expect(row).toMatchObject({ targetType: "Challenge", targetId: ID });
      expect(row.metadata).toMatchObject({ hintId: HINT });
    }
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  areLessonsComplete: vi.fn(),
  findProgress: vi.fn(),
  linkCertificate: vi.fn(),
  upsertProgress: vi.fn(),
  create: vi.fn(),
  notify: vi.fn(),
  pathFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
  certUpdate: vi.fn(),
  certCount: vi.fn(),
  findAllActive: vi.fn(),
  evaluateBadges: vi.fn(),
  transaction: vi.fn(),
  tx: {
    userBadge: { createManyAndReturn: vi.fn() },
    user: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    notification: { createMany: vi.fn() },
  },
}));

vi.mock("@cyberlearn/db", () => ({
  pathRepository: {
    areLessonsComplete: m.areLessonsComplete,
    findProgress: m.findProgress,
    linkCertificate: m.linkCertificate,
    upsertProgress: m.upsertProgress,
  },
  certificateRepository: { create: m.create },
  notificationRepository: { create: m.notify },
  badgeRepository: {
    findAllActive: m.findAllActive,
    findUserBadgeIds: vi.fn().mockResolvedValue(new Set()),
    findCriterionFacts: vi.fn().mockResolvedValue({
      completedLessons: [],
      completedPathIds: [],
      totalCertificates: 0,
      perfectQuizCount: 0,
      placementScores: null,
    }),
  },
  userRepository: {
    findForGamification: vi.fn().mockResolvedValue({ xpTotal: 0, streakDays: 0 }),
  },
  prisma: {
    path: { findUnique: m.pathFindUnique },
    user: { findUnique: m.userFindUnique },
    certificate: { update: m.certUpdate, count: m.certCount },
    $transaction: m.transaction,
  },
}));
vi.mock("@cyberlearn/db/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    storage: { from: () => ({ upload: vi.fn().mockResolvedValue({ data: {}, error: null }) }) },
  }),
}));
vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from("pdf")),
}));
vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,AA") },
}));
vi.mock("@cyberlearn/lib", () => ({
  evaluateBadges: m.evaluateBadges,
  buildBadgeCriterionStats: vi.fn().mockReturnValue({
    xpTotal: 0,
    streakDays: 0,
    totalLessonsCompleted: 0,
    categoryLessonCounts: {},
    completedLessonIds: new Set(),
    completedPathsCount: 0,
    completedPathIds: new Set(),
    totalCertificates: 0,
    perfectQuizCount: 0,
    placementMasteredCount: 0,
  }),
  // Used by the awardBadges helper for the level recompute on credit.
  computeLevel: (xp: number) => ({ level: Math.floor(xp / 100) + 1, current: 0, needed: 100 }),
}));
vi.mock("@/lib/pdf/certificate-template", () => ({ CertificateDocument: () => null }));

import { issueCertificate } from "../issue";

beforeEach(() => {
  vi.clearAllMocks();
  m.create.mockResolvedValue({ id: "cert-1", publicId: "pub-1" });
  m.pathFindUnique.mockResolvedValue({ title: "Path", slug: "path", _count: { lessons: 2 } });
  m.userFindUnique.mockResolvedValue({ displayName: "Alice" });
  m.certCount.mockResolvedValue(0);
  m.findAllActive.mockResolvedValue([]);
  m.evaluateBadges.mockReturnValue([]);
  m.transaction.mockImplementation((cb: (tx: unknown) => Promise<unknown>) => cb(m.tx));
  m.tx.userBadge.createManyAndReturn.mockResolvedValue([]);
  m.tx.user.findUniqueOrThrow.mockResolvedValue({ xpTotal: 0 });
});

describe("issueCertificate — gate + idempotence guards", () => {
  it("no-op when lessons are not complete (no cert created)", async () => {
    m.areLessonsComplete.mockResolvedValue(false);
    m.findProgress.mockResolvedValue(null);

    const res = await issueCertificate("u1", "p1", { score: 90 });

    expect(res).toEqual({ issued: false });
    expect(m.create).not.toHaveBeenCalled();
    expect(m.linkCertificate).not.toHaveBeenCalled();
  });

  it("no-op when the path is already COMPLETED (avoids the @@unique on create)", async () => {
    m.areLessonsComplete.mockResolvedValue(true);
    m.findProgress.mockResolvedValue({ status: "COMPLETED", certificateId: "c0" });

    const res = await issueCertificate("u1", "p1", { score: 90 });

    expect(res).toEqual({ issued: false });
    expect(m.create).not.toHaveBeenCalled();
  });

  it("happy path: creates the cert WITH score, links COMPLETED, notifies", async () => {
    m.areLessonsComplete.mockResolvedValue(true);
    m.findProgress.mockResolvedValue({ status: "IN_PROGRESS", certificateId: null });

    const res = await issueCertificate("u1", "p1", { score: 85, passThreshold: 70 });

    expect(res).toEqual({ issued: true, certId: "cert-1" });
    expect(m.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", pathId: "p1", score: 85, passThreshold: 70 }),
    );
    expect(m.linkCertificate).toHaveBeenCalledWith("u1", "p1", "cert-1");
    expect(m.upsertProgress).not.toHaveBeenCalled();
  });

  it("quiz-less issuance carries no score (stays null)", async () => {
    m.areLessonsComplete.mockResolvedValue(true);
    m.findProgress.mockResolvedValue(null);

    await issueCertificate("u1", "p1");

    const arg = m.create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(arg.score).toBeUndefined();
    expect(arg.passThreshold).toBeUndefined();
  });

  it("preserves COMPLETED even if PDF generation fails (pre-existing behaviour)", async () => {
    m.areLessonsComplete.mockResolvedValue(true);
    m.findProgress.mockResolvedValue(null);
    m.userFindUnique.mockResolvedValue(null); // generateCertificatePdf returns null

    const res = await issueCertificate("u1", "p1", { score: 80 });

    expect(res.issued).toBe(true);
    expect(m.create).not.toHaveBeenCalled(); // gen aborted before create
    expect(m.linkCertificate).not.toHaveBeenCalled();
    expect(m.upsertProgress).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", pathId: "p1", status: "COMPLETED" }),
    );
  });
});

describe("issueCertificate — path badge awarding through the shared helper", () => {
  it("inserts the badge, credits its xpReward and notifies with the xp in metadata", async () => {
    m.areLessonsComplete.mockResolvedValue(true);
    m.findProgress.mockResolvedValue(null);
    m.findAllActive.mockResolvedValue([
      {
        id: "b1",
        name: "Architecte",
        description: "Complétez un parcours entier.",
        rarity: "EPIC",
        xpReward: 75,
        isActive: true,
        criterionType: "PATH_COMPLETED",
        criterionData: { count: 1 },
      },
    ]);
    m.evaluateBadges.mockReturnValue(["b1"]);
    m.tx.userBadge.createManyAndReturn.mockResolvedValue([{ badgeId: "b1" }]);
    m.tx.user.findUniqueOrThrow.mockResolvedValue({ xpTotal: 200 });

    await issueCertificate("u1", "p1", { score: 90 });

    // Row stamped with xpCredited at insertion.
    expect(m.tx.userBadge.createManyAndReturn).toHaveBeenCalledWith({
      data: [{ userId: "u1", badgeId: "b1", context: { pathId: "p1", xpCredited: 75 } }],
      skipDuplicates: true,
      select: { badgeId: true },
    });
    // XP credited + level recomputed (fake computeLevel: floor(xp/100)+1).
    expect(m.tx.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { xpTotal: 275, level: 3 },
    });
    // Notification carries the xpReward.
    const notifArg = m.tx.notification.createMany.mock.calls[0]?.[0] as {
      data: { metadata: Record<string, unknown> }[];
    };
    expect(notifArg.data[0]?.metadata).toEqual({ badgeId: "b1", rarity: "EPIC", xpReward: 75 });
  });

  it("skips the transaction entirely when no badge unlocks", async () => {
    m.areLessonsComplete.mockResolvedValue(true);
    m.findProgress.mockResolvedValue(null);

    await issueCertificate("u1", "p1");

    expect(m.transaction).not.toHaveBeenCalled();
  });
});

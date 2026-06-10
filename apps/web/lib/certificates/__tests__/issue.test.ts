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
    findAllActive: vi.fn().mockResolvedValue([]),
    findUserBadgeIds: vi.fn().mockResolvedValue([]),
  },
  userRepository: {
    findForGamification: vi.fn().mockResolvedValue({ xpTotal: 0, streakDays: 0 }),
    countCompletedLessonsByCategory: vi.fn().mockResolvedValue({ total: 0, byCategory: {} }),
  },
  prisma: {
    path: { findUnique: m.pathFindUnique },
    user: { findUnique: m.userFindUnique },
    certificate: { update: m.certUpdate, count: m.certCount },
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
vi.mock("@cyberlearn/lib", () => ({ evaluateBadges: vi.fn().mockReturnValue([]) }));
vi.mock("@/lib/pdf/certificate-template", () => ({ CertificateDocument: () => null }));

import { issueCertificate } from "../issue";

beforeEach(() => {
  vi.clearAllMocks();
  m.create.mockResolvedValue({ id: "cert-1", publicId: "pub-1" });
  m.pathFindUnique.mockResolvedValue({ title: "Path", slug: "path", _count: { lessons: 2 } });
  m.userFindUnique.mockResolvedValue({ displayName: "Alice" });
  m.certCount.mockResolvedValue(0);
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

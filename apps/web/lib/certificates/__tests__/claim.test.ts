import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted: the vi.mock factories are hoisted above these declarations.
const m = vi.hoisted(() => ({
  findFirst: vi.fn<(args: unknown) => Promise<{ id: string } | null>>(),
  findActiveQuizByPathId: vi.fn<(pathId: string) => Promise<{ id: string } | null>>(),
  issueCertificate:
    vi.fn<(userId: string, pathId: string) => Promise<{ issued: boolean; certId?: string }>>(),
}));

vi.mock("@/lib/certificates/issue", () => ({ issueCertificate: m.issueCertificate }));
vi.mock("@cyberlearn/db", () => ({
  CATALOGUE_PATH: { status: "PUBLISHED", audience: "CATALOGUE" },
  prisma: { path: { findFirst: m.findFirst } },
  quizRepository: { findActiveQuizByPathId: m.findActiveQuizByPathId },
}));

const { claimCertificate } = await import("../claim");

beforeEach(() => {
  m.findFirst.mockReset();
  m.findActiveQuizByPathId.mockReset();
  m.issueCertificate.mockReset();
});

describe("claimCertificate", () => {
  it.each([[undefined], [42], [""], ["Pas-Un-Slug"], ["../autre"]])(
    "refuses a malformed slug (%s) without reading anything",
    async (slug) => {
      expect(await claimCertificate("user-1", slug)).toEqual({
        ok: false,
        error: "Parcours introuvable.",
      });
      expect(m.findFirst).not.toHaveBeenCalled();
    },
  );

  it("only looks among catalogue paths: a class path carries no certificate", async () => {
    m.findFirst.mockResolvedValue(null);
    expect(await claimCertificate("user-1", "parcours-de-classe")).toEqual({
      ok: false,
      error: "Parcours introuvable.",
    });
    expect(m.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "parcours-de-classe", status: "PUBLISHED", audience: "CATALOGUE" },
      }),
    );
    expect(m.issueCertificate).not.toHaveBeenCalled();
  });

  it("refuses a path whose certificate comes with its exam", async () => {
    m.findFirst.mockResolvedValue({ id: "path-1" });
    m.findActiveQuizByPathId.mockResolvedValue({ id: "quiz-1" });
    expect(await claimCertificate("user-1", "reseau-bases")).toEqual({
      ok: false,
      error: "Un examen final est requis pour ce parcours.",
    });
    expect(m.issueCertificate).not.toHaveBeenCalled();
  });

  it("refuses while lessons remain, as the issuer decides", async () => {
    m.findFirst.mockResolvedValue({ id: "path-1" });
    m.findActiveQuizByPathId.mockResolvedValue(null);
    m.issueCertificate.mockResolvedValue({ issued: false });
    expect(await claimCertificate("user-1", "reseau-bases")).toEqual({
      ok: false,
      error: "Termine toutes les leçons du parcours d'abord.",
    });
  });

  it("issues the certificate to the given user", async () => {
    m.findFirst.mockResolvedValue({ id: "path-1" });
    m.findActiveQuizByPathId.mockResolvedValue(null);
    m.issueCertificate.mockResolvedValue({ issued: true, certId: "cert-1" });
    expect(await claimCertificate("user-1", "reseau-bases")).toEqual({ ok: true });
    expect(m.issueCertificate).toHaveBeenCalledWith("user-1", "path-1");
  });
});

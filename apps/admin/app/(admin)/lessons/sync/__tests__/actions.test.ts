import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAction = vi.fn();
vi.mock("@/lib/auth", () => ({ requireAdminAction }));

const applyLessonUpdate = vi.fn();
vi.mock("@/lib/services/lesson-sync.service", () => ({ applyLessonUpdate }));

const importLessonFromRepository = vi.fn();
const syncPathFromRepository = vi.fn();
const publishCatalogueDrafts = vi.fn();
vi.mock("@/lib/services/repository-import.service", () => ({
  importLessonFromRepository,
  syncPathFromRepository,
  publishCatalogueDrafts,
}));

const {
  importLessonFromRepositoryAction,
  publishCatalogueFromRepositoryAction,
  syncPathFromRepositoryAction,
  updateLessonFromRepositoryAction,
} = await import("../actions");

const HASH = "a".repeat(64);

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminAction.mockResolvedValue({ id: "admin-1", email: undefined, role: "ADMIN" });
});

describe("updateLessonFromRepositoryAction", () => {
  it("checks the caller is an admin before anything else", async () => {
    requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(
      updateLessonFromRepositoryAction({ refCode: "CL-LSN-005-V01", hash: HASH }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(applyLessonUpdate).not.toHaveBeenCalled();
  });

  it.each([
    ["a refCode that is not one", { refCode: "../../etc/passwd", hash: HASH }],
    ["a fingerprint that is not one", { refCode: "CL-LSN-005-V01", hash: "abc" }],
  ])("refuses %s", async (_, input) => {
    expect(await updateLessonFromRepositoryAction(input)).toEqual({
      ok: false,
      message: "Demande invalide.",
      details: [],
    });
    expect(applyLessonUpdate).not.toHaveBeenCalled();
  });

  it("updates on behalf of the admin, from the refCode and fingerprint only", async () => {
    applyLessonUpdate.mockResolvedValue({ ok: true, lessonId: "l-1" });
    const input = { refCode: "CL-LSN-005-V01", hash: HASH, contentMdx: "<script>" };
    expect(await updateLessonFromRepositoryAction(input)).toEqual({ ok: true });
    expect(applyLessonUpdate).toHaveBeenCalledWith("CL-LSN-005-V01", HASH, "admin-1");
  });

  it("passes on why an update was refused, field by field", async () => {
    applyLessonUpdate.mockResolvedValue({
      ok: false,
      reason: "invalid",
      message: "python/05.mdx ne passe pas les contrôles de l'import.",
      errors: [
        { field: "contentMdx", message: "Section 2 : balise non fermée" },
        { message: "Autre" },
      ],
    });
    expect(
      await updateLessonFromRepositoryAction({ refCode: "CL-LSN-005-V01", hash: HASH }),
    ).toEqual({
      ok: false,
      message: "python/05.mdx ne passe pas les contrôles de l'import.",
      details: ["contentMdx : Section 2 : balise non fermée", "Autre"],
    });
  });
});

describe("importLessonFromRepositoryAction", () => {
  it("checks the caller is an admin before anything else", async () => {
    requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(importLessonFromRepositoryAction({ refCode: "CL-LSN-01008-V01" })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(importLessonFromRepository).not.toHaveBeenCalled();
  });

  it("refuses a refCode that is not one", async () => {
    expect(await importLessonFromRepositoryAction({ refCode: "../content/x.mdx" })).toEqual({
      ok: false,
      message: "Demande invalide.",
      details: [],
    });
    expect(importLessonFromRepository).not.toHaveBeenCalled();
  });

  it("imports on behalf of the admin, from the refCode only", async () => {
    importLessonFromRepository.mockResolvedValue({ ok: true, lessonId: "l-1" });
    const input = { refCode: "CL-LSN-01008-V01", content: "<script>" };
    expect(await importLessonFromRepositoryAction(input)).toEqual({ ok: true });
    expect(importLessonFromRepository).toHaveBeenCalledWith("CL-LSN-01008-V01", "admin-1");
  });

  it("passes on why an import was refused, field by field", async () => {
    importLessonFromRepository.mockResolvedValue({
      ok: false,
      reason: "invalid",
      message: "f1/01008.mdx ne passe pas les contrôles de l'import.",
      errors: [{ field: "prerequisites", message: "Prerequis introuvable: CL-LSN-01901-V01" }],
    });
    expect(await importLessonFromRepositoryAction({ refCode: "CL-LSN-01008-V01" })).toEqual({
      ok: false,
      message: "f1/01008.mdx ne passe pas les contrôles de l'import.",
      details: ["prerequisites : Prerequis introuvable: CL-LSN-01901-V01"],
    });
  });
});

describe("syncPathFromRepositoryAction", () => {
  it("checks the caller is an admin before anything else", async () => {
    requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(syncPathFromRepositoryAction({ refCode: "CL-PATH-101-V01" })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(syncPathFromRepository).not.toHaveBeenCalled();
  });

  it("refuses a lesson refCode where a path one is expected", async () => {
    expect(await syncPathFromRepositoryAction({ refCode: "CL-LSN-01008-V01" })).toEqual({
      ok: false,
      message: "Demande invalide.",
      details: [],
    });
    expect(syncPathFromRepository).not.toHaveBeenCalled();
  });

  it("writes the path on behalf of the admin", async () => {
    syncPathFromRepository.mockResolvedValue({ ok: true, created: true, attached: 8, missing: 0 });
    expect(await syncPathFromRepositoryAction({ refCode: "CL-PATH-101-V01" })).toEqual({
      ok: true,
    });
    expect(syncPathFromRepository).toHaveBeenCalledWith("CL-PATH-101-V01", "admin-1");
  });

  it("passes on the manifest errors that stopped the sync", async () => {
    syncPathFromRepository.mockResolvedValue({
      ok: false,
      reason: "invalid",
      message: "Les manifestes de content/paths ne passent pas leurs contrôles.",
      details: ["linux.json : slug linux déjà utilisé par autre.json."],
    });
    expect(await syncPathFromRepositoryAction({ refCode: "CL-PATH-102-V01" })).toEqual({
      ok: false,
      message: "Les manifestes de content/paths ne passent pas leurs contrôles.",
      details: ["linux.json : slug linux déjà utilisé par autre.json."],
    });
  });
});

describe("publishCatalogueFromRepositoryAction", () => {
  it("checks the caller is an admin before publishing anything", async () => {
    requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(publishCatalogueFromRepositoryAction()).rejects.toThrow("NEXT_REDIRECT");
    expect(publishCatalogueDrafts).not.toHaveBeenCalled();
  });

  it("publishes on behalf of the admin and reports the counts", async () => {
    publishCatalogueDrafts.mockResolvedValue({ lessons: 60, paths: 2 });
    expect(await publishCatalogueFromRepositoryAction()).toEqual({ lessons: 60, paths: 2 });
    expect(publishCatalogueDrafts).toHaveBeenCalledWith("admin-1");
  });
});

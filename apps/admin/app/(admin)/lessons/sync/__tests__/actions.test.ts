import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAction = vi.fn();
vi.mock("@/lib/auth", () => ({ requireAdminAction }));

const applyLessonUpdate = vi.fn();
vi.mock("@/lib/services/lesson-sync.service", () => ({ applyLessonUpdate }));

const { updateLessonFromRepositoryAction } = await import("../actions");

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

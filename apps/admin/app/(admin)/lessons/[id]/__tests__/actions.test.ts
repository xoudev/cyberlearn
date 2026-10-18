import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The lesson studio's actions. The repositories are mocked: what is checked
 * here is what each action lets through to them, what it refuses first, and
 * how it says so. The MDX check is the real one, as the publish runs it.
 */

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn(),
  revalidatePath: vi.fn(),
  draftGet: vi.fn(),
  draftSave: vi.fn(),
  draftDiscard: vi.fn(),
  draftPublish: vi.fn(),
  versionFind: vi.fn(),
  versionCurrent: vi.fn(),
  lessonFindFirst: vi.fn(),
  auditRecord: vi.fn(),
  resolveCover: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/lib/lesson-cover/storage", () => ({ resolveLessonCoverSrc: m.resolveCover }));
vi.mock("@cyberlearn/db", () => ({
  // A stand-in fingerprint: what is checked is which lesson it is taken of.
  lessonBaseOf: ({ version, title }: { version: number; title: string }) => ({
    version,
    contentHash: `hash-of:${title}`,
  }),
  // The content fields alone, as the real one keeps them.
  lessonContentOf: ({
    refCode,
    slug,
    title,
    description,
    category,
    difficulty,
    estimatedMinutes,
    xpReward,
    contentMdx,
    coverImageUrl,
  }: Record<string, unknown>) => ({
    refCode,
    slug,
    title,
    description,
    category,
    difficulty,
    estimatedMinutes,
    xpReward,
    contentMdx,
    coverImageUrl,
  }),
  lessonDraftRepository: {
    get: m.draftGet,
    save: m.draftSave,
    discard: m.draftDiscard,
    publish: m.draftPublish,
  },
  lessonVersionRepository: { find: m.versionFind, current: m.versionCurrent },
  auditLogRepository: { record: m.auditRecord },
  prisma: {
    lesson: { findFirst: m.lessonFindFirst },
  },
}));

const {
  discardLessonDraftAction,
  publishLessonChangesAction,
  restoreLessonVersionAction,
  saveLessonDraftAction,
} = await import("../actions");

const LESSON = "11111111-1111-4111-8111-111111111111";
const VERSION = "33333333-3333-4333-8333-333333333333";
const SAVED_AT = new Date("2026-10-18T12:00:00.000Z");
/** The lesson as the studio loaded it. */
const BASE = { version: 1, contentHash: "a".repeat(64) };
/** Built, not typed: the typography check keeps the character itself out of the sources. */
const EM_DASH = String.fromCharCode(0x2014);

const CONTENT = {
  refCode: "CL-LSN-01001-V01",
  slug: "les-ports",
  title: "Les ports réseau",
  description: "Ce qu'est un port, et pourquoi il y en a tant.",
  category: "NETWORK" as const,
  difficulty: "BEGINNER" as const,
  estimatedMinutes: 15,
  xpReward: 50,
  contentMdx: "## Ports\n\nUn port est un numéro qui désigne un service.\n",
  coverImageUrl: null,
};

function draftRow(overrides: Partial<typeof CONTENT> = {}): Record<string, unknown> {
  return {
    ...CONTENT,
    ...overrides,
    baseVersion: 1,
    updatedAt: SAVED_AT,
    updatedBy: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: "admin-1" });
  m.draftGet.mockResolvedValue(draftRow());
  m.draftSave.mockResolvedValue({ ok: true, updatedAt: SAVED_AT });
  m.draftDiscard.mockResolvedValue(true);
  m.draftPublish.mockResolvedValue({ ok: true, version: 2, content: CONTENT, updatedAt: SAVED_AT });
  m.lessonFindFirst.mockResolvedValue(null);
  m.auditRecord.mockResolvedValue(undefined);
  m.versionCurrent.mockResolvedValue({ ...CONTENT, version: 2 });
  m.resolveCover.mockImplementation((marker: string) =>
    Promise.resolve(`https://signed.example/${marker}`),
  );
});

describe("saveLessonDraftAction", () => {
  it("saves a half-written draft, which no publish rule holds back", async () => {
    const half = { ...CONTENT, title: "Le", slug: "Les Ports en cours", estimatedMinutes: 0 };
    const result = await saveLessonDraftAction({
      lessonId: LESSON,
      expectedUpdatedAt: null,
      base: BASE,
      content: half,
    });
    expect(result).toEqual({ ok: true, savedAt: SAVED_AT.toISOString(), problems: [] });
    expect(m.draftSave).toHaveBeenCalledExactlyOnceWith(LESSON, half, {
      actorId: "admin-1",
      expectedUpdatedAt: null,
      base: BASE,
    });
  });

  it("saves numbers past what a publish takes: the publish refuses them by name", async () => {
    const over = { ...CONTENT, estimatedMinutes: 700, xpReward: 20_000 };
    const result = await saveLessonDraftAction({
      lessonId: LESSON,
      expectedUpdatedAt: null,
      base: BASE,
      content: over,
    });
    expect(result.ok).toBe(true);
    expect(m.draftSave.mock.calls[0]?.[1]).toEqual(over);
  });

  it("names the field a refused save is about", async () => {
    const result = await saveLessonDraftAction({
      lessonId: LESSON,
      expectedUpdatedAt: null,
      base: BASE,
      content: { ...CONTENT, refCode: "X".repeat(65) },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("« Ref code »");
    expect(m.draftSave).not.toHaveBeenCalled();
  });

  it("refuses a save that does not say which lesson the fields started from", async () => {
    const result = await saveLessonDraftAction({
      lessonId: LESSON,
      expectedUpdatedAt: null,
      base: { version: 1, contentHash: "not-a-hash" },
      content: CONTENT,
    });
    expect(result.ok).toBe(false);
    expect(m.draftSave).not.toHaveBeenCalled();
  });

  it("writes over the draft the studio last saw, and only that one", async () => {
    await saveLessonDraftAction({
      lessonId: LESSON,
      expectedUpdatedAt: SAVED_AT.toISOString(),
      base: BASE,
      content: CONTENT,
    });
    expect(m.draftSave.mock.calls[0]?.[2]).toEqual({
      actorId: "admin-1",
      expectedUpdatedAt: SAVED_AT,
      base: BASE,
    });
  });

  it("says what publishing would refuse, for the editor to mark now", async () => {
    const result = await saveLessonDraftAction({
      lessonId: LESSON,
      expectedUpdatedAt: null,
      base: BASE,
      content: { ...CONTENT, contentMdx: `## Ports\n\nUn port ${EM_DASH} un numéro.\n` },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.problems.length).toBeGreaterThan(0);
    // Saved all the same: a draft can be wrong.
    expect(m.draftSave).toHaveBeenCalledOnce();
  });

  it("stops the autosave on a conflict", async () => {
    m.draftSave.mockResolvedValue({ ok: false, reason: "conflict" });
    const result = await saveLessonDraftAction({
      lessonId: LESSON,
      expectedUpdatedAt: SAVED_AT.toISOString(),
      base: BASE,
      content: CONTENT,
    });
    expect(result).toMatchObject({ ok: false, conflict: true });
    if (!result.ok) expect(result.error).toContain("Recharge la page");
  });

  it("refuses what the draft's columns cannot hold, before the repository", async () => {
    const result = await saveLessonDraftAction({
      lessonId: LESSON,
      expectedUpdatedAt: null,
      base: BASE,
      content: { ...CONTENT, category: "COOKING" },
    });
    expect(result.ok).toBe(false);
    expect(m.draftSave).not.toHaveBeenCalled();
  });

  it("checks the caller is an admin before anything else", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(
      saveLessonDraftAction({
        lessonId: LESSON,
        expectedUpdatedAt: null,
        base: BASE,
        content: CONTENT,
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(m.draftSave).not.toHaveBeenCalled();
  });
});

describe("publishLessonChangesAction", () => {
  const input = { lessonId: LESSON, expectedUpdatedAt: SAVED_AT.toISOString() };

  it("publishes the draft the studio saw, trimmed as the lesson stores it", async () => {
    const result = await publishLessonChangesAction(input);
    // The lesson as published is what the studio's next draft starts from.
    expect(result).toEqual({
      ok: true,
      version: 2,
      content: CONTENT,
      base: { version: 2, contentHash: `hash-of:${CONTENT.title}` },
    });
    expect(m.draftPublish).toHaveBeenCalledExactlyOnceWith(
      LESSON,
      { ...CONTENT, contentMdx: CONTENT.contentMdx.trim() },
      { actorId: "admin-1", expectedUpdatedAt: SAVED_AT, force: false },
    );
    expect(m.revalidatePath).toHaveBeenCalledWith(`/lessons/${LESSON}`);
  });

  it("refuses a draft that moved since the studio saved it", async () => {
    m.draftGet.mockResolvedValue({ ...draftRow(), updatedAt: new Date("2026-10-18T12:05:00Z") });
    const result = await publishLessonChangesAction(input);
    expect(result).toMatchObject({ ok: false, conflict: "draft" });
    expect(m.draftPublish).not.toHaveBeenCalled();
  });

  it("applies the form's rules, field by field", async () => {
    m.draftGet.mockResolvedValue(draftRow({ title: "Le", slug: "Les Ports" }));
    const result = await publishLessonChangesAction(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual(["slug", "title"]);
    }
    expect(m.draftPublish).not.toHaveBeenCalled();
  });

  it("refuses MDX the site could not render, and marks where", async () => {
    m.draftGet.mockResolvedValue(
      draftRow({
        contentMdx: '## Quiz\n\n<Quiz id="q" question="?" options={["a", "b"]} correct={True} />\n',
      }),
    );
    const result = await publishLessonChangesAction(input);
    expect(result).toMatchObject({ ok: false, error: "Le contenu ne s'affiche pas." });
    if (!result.ok) {
      expect(result.fieldErrors?.contentMdx).toContain("ligne");
      expect(result.problems?.length).toBe(1);
    }
    expect(m.draftPublish).not.toHaveBeenCalled();
  });

  it("refuses a refCode another lesson holds", async () => {
    m.lessonFindFirst.mockResolvedValueOnce({ id: "other" });
    const result = await publishLessonChangesAction(input);
    expect(result).toMatchObject({ ok: false, fieldErrors: { refCode: "Déjà utilisé" } });
    expect(m.draftPublish).not.toHaveBeenCalled();
  });

  it("asks before replacing a lesson that changed under the draft, then publishes when told", async () => {
    m.draftPublish.mockResolvedValueOnce({ ok: false, reason: "lesson_changed" });
    expect(await publishLessonChangesAction(input)).toMatchObject({
      ok: false,
      conflict: "lesson",
    });

    await publishLessonChangesAction({ ...input, force: true });
    expect(m.draftPublish.mock.lastCall?.[2]).toMatchObject({ force: true });
  });

  it("hands back the lesson when the draft held what it already does", async () => {
    m.draftPublish.mockResolvedValue({ ok: false, reason: "unchanged", version: 3 });
    const result = await publishLessonChangesAction(input);
    expect(result).toMatchObject({
      ok: false,
      discarded: {
        content: { ...CONTENT, contentMdx: CONTENT.contentMdx.trim() },
        base: { version: 3, contentHash: `hash-of:${CONTENT.title}` },
      },
    });
  });

  it("names the field a unique violation slipped in on", async () => {
    m.draftPublish.mockResolvedValue({ ok: false, reason: "taken", field: "slug" });
    expect(await publishLessonChangesAction(input)).toMatchObject({
      ok: false,
      fieldErrors: { slug: "Déjà utilisé" },
    });
  });
});

describe("discardLessonDraftAction", () => {
  it("drops the draft and writes down who did", async () => {
    expect(await discardLessonDraftAction({ lessonId: LESSON })).toMatchObject({ ok: true });
    expect(m.draftDiscard).toHaveBeenCalledExactlyOnceWith(LESSON);
    expect(m.auditRecord.mock.calls[0]?.[0]).toMatchObject({
      actorId: "admin-1",
      action: "lesson.draft.discard",
      targetType: "Lesson",
      targetId: LESSON,
    });
  });

  it("writes nothing down when there was no draft", async () => {
    m.draftDiscard.mockResolvedValue(false);
    await discardLessonDraftAction({ lessonId: LESSON });
    expect(m.auditRecord).not.toHaveBeenCalled();
  });

  it("hands back the lesson as it is now, for the studio to go back to", async () => {
    // A sync changed the lesson, and its cover, since the page loaded.
    const synced = { ...CONTENT, title: "Les ports, synchronisés", coverImageUrl: "__cover:new" };
    m.versionCurrent.mockResolvedValue({ ...synced, version: 4 });
    expect(await discardLessonDraftAction({ lessonId: LESSON })).toEqual({
      ok: true,
      content: synced,
      base: { version: 4, contentHash: `hash-of:${synced.title}` },
      coverPreview: "https://signed.example/__cover:new",
    });
    expect(m.versionCurrent).toHaveBeenCalledWith(LESSON);
  });

  it("says so when the lesson is gone", async () => {
    m.versionCurrent.mockResolvedValue(null);
    expect(await discardLessonDraftAction({ lessonId: LESSON })).toMatchObject({ ok: false });
  });
});

describe("restoreLessonVersionAction", () => {
  it("hands a version's content to the studio, and writes nothing", async () => {
    m.versionFind.mockResolvedValue({ ...CONTENT, version: 1 });
    const result = await restoreLessonVersionAction({ lessonId: LESSON, versionId: VERSION });
    expect(result).toEqual({ ok: true, version: 1, content: CONTENT, coverPreview: null });
    expect(m.versionFind).toHaveBeenCalledWith(LESSON, VERSION);
    expect(m.draftSave).not.toHaveBeenCalled();
    expect(m.resolveCover).not.toHaveBeenCalled();
  });

  it("signs a preview of the version's cover, which the page signed none for", async () => {
    m.versionFind.mockResolvedValue({ ...CONTENT, coverImageUrl: "__cover:old", version: 1 });
    expect(
      await restoreLessonVersionAction({ lessonId: LESSON, versionId: VERSION }),
    ).toMatchObject({ ok: true, coverPreview: "https://signed.example/__cover:old" });
  });

  it("says so for a version that is not this lesson's", async () => {
    m.versionFind.mockResolvedValue(null);
    expect(
      await restoreLessonVersionAction({ lessonId: LESSON, versionId: VERSION }),
    ).toMatchObject({ ok: false });
  });
});

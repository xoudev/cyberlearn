import { describe, expect, it } from "vitest";
import {
  answersAfterEdit,
  autosaveLabel,
  draftContentOf,
  fieldsOf,
  initialStudioState,
  sameContent,
  studioReducer,
  wholeNumber,
  type StudioFields,
} from "../studio-state";

/**
 * What the lesson studio holds. The point of it: nothing the author typed is
 * lost to an action's answer. A refused publish changes the errors only.
 */

const PUBLISHED = fieldsOf({
  refCode: "CL-LSN-01001-V01",
  slug: "les-ports",
  title: "Les ports réseau",
  description: "Ce qu'est un port, et pourquoi il y en a tant.",
  category: "NETWORK",
  difficulty: "BEGINNER",
  estimatedMinutes: 15,
  xpReward: 50,
  contentMdx: "## Ports\n\nUn port est un numéro.",
  coverImageUrl: null,
});

const TYPED: StudioFields = { ...PUBLISHED, title: "Les ports, en pratique", xpReward: "60" };

describe("studioReducer", () => {
  it("keeps every field as typed when a publish is refused", () => {
    const state = studioReducer(initialStudioState(PUBLISHED, TYPED), {
      type: "refused",
      error: "Des champs sont à corriger avant de publier.",
      fieldErrors: { slug: "Déjà utilisé", pathIds: "ignoré" },
    });
    expect(state.fields).toBe(TYPED);
    expect(state.error).toBe("Des champs sont à corriger avant de publier.");
    // Only the fields the studio shows.
    expect(state.fieldErrors).toEqual({ slug: "Déjà utilisé" });
  });

  it("takes a field's error down once the field is touched, and leaves the others", () => {
    const refused = studioReducer(initialStudioState(PUBLISHED, TYPED), {
      type: "refused",
      error: "x",
      fieldErrors: { slug: "Déjà utilisé", title: "Trop court" },
    });
    const edited = studioReducer(refused, { type: "edit", field: "slug", value: "les-ports-2" });
    expect(edited.fields.slug).toBe("les-ports-2");
    expect(edited.fieldErrors).toEqual({ title: "Trop court" });
  });

  it("remembers a conflict, until it is dismissed", () => {
    const state = studioReducer(initialStudioState(PUBLISHED, TYPED), {
      type: "refused",
      error: "La leçon publiée a changé.",
      conflict: "lesson",
    });
    expect(state.conflict).toBe("lesson");
    expect(studioReducer(state, { type: "dismiss" })).toMatchObject({
      conflict: null,
      error: null,
      fields: TYPED,
    });
  });

  it("takes the quiz warning down once the content it was read from changes", () => {
    const warned = studioReducer(initialStudioState(PUBLISHED, TYPED), {
      type: "refused",
      error: "Quiz modifiés qui ont déjà des réponses : « q1 ».",
      conflict: "quizzes",
    });
    expect(warned.conflict).toBe("quizzes");
    // Another field leaves it standing: the quizzes are in the content.
    expect(studioReducer(warned, { type: "edit", field: "title", value: "Ports" })).toMatchObject({
      conflict: "quizzes",
      error: warned.error,
    });
    // The content itself is what the warning was read from.
    expect(
      studioReducer(warned, { type: "edit", field: "contentMdx", value: "## Ports\n\nAutre." }),
    ).toMatchObject({ conflict: null, error: null });
  });

  it("keeps a lesson conflict standing when the content is edited", () => {
    const state = studioReducer(initialStudioState(PUBLISHED, TYPED, "La leçon a changé."), {
      type: "edit",
      field: "contentMdx",
      value: "## Ports\n\nAutre.",
    });
    expect(state).toMatchObject({ conflict: "lesson", error: "La leçon a changé." });
  });

  it("forgets the go-ahead given to the quizzes once the content is edited", () => {
    const told = { force: true, quizzesSeen: true };
    // The content is what the quizzes were read from: a lesson conflict that
    // stands after the edit must not publish the new ones unannounced.
    expect(answersAfterEdit(told, "contentMdx")).toEqual({ force: true, quizzesSeen: false });
    // The other fields are not quizzes, and the lesson's own go-ahead stays.
    expect(answersAfterEdit(told, "title")).toEqual(told);
    expect(answersAfterEdit({ force: false, quizzesSeen: false }, "contentMdx")).toEqual({
      force: false,
      quizzesSeen: false,
    });
  });

  it("puts what was published in the fields, unless more was typed meanwhile", () => {
    const now = { ...TYPED, title: TYPED.title.trim() };
    const replaced = studioReducer(initialStudioState(PUBLISHED, TYPED), {
      type: "published",
      published: now,
      replaceFields: true,
    });
    expect(replaced).toMatchObject({ published: now, fields: now, error: null });

    const kept = studioReducer(initialStudioState(PUBLISHED, TYPED), {
      type: "published",
      published: now,
      replaceFields: false,
    });
    expect(kept.fields).toBe(TYPED);
    expect(kept.published).toBe(now);
  });

  it("goes back to the lesson as it is now on a discard, not as the page loaded it", () => {
    const synced = { ...PUBLISHED, title: "Les ports, synchronisés" };
    const state = studioReducer(initialStudioState(PUBLISHED, TYPED), {
      type: "discarded",
      published: synced,
    });
    expect(state).toMatchObject({ fields: synced, published: synced, error: null });
  });

  it("opens on the lesson conflict when the draft's lesson changed since it was started", () => {
    // A sync wrote the file over the lesson while the draft was open.
    const state = initialStudioState(PUBLISHED, TYPED, "La leçon publiée a changé.");
    expect(state).toMatchObject({
      fields: TYPED,
      error: "La leçon publiée a changé.",
      conflict: "lesson",
    });
    expect(initialStudioState(PUBLISHED, TYPED)).toMatchObject({ error: null, conflict: null });
  });

  it("replaces the fields with a restored version, and clears what was refused", () => {
    const refused = studioReducer(initialStudioState(PUBLISHED, TYPED), {
      type: "refused",
      error: "x",
      fieldErrors: { title: "Trop court" },
    });
    const restored = studioReducer(refused, { type: "replace", fields: PUBLISHED });
    expect(restored).toMatchObject({ fields: PUBLISHED, fieldErrors: {}, error: null });
  });
});

describe("the draft's content", () => {
  it("is saved with the columns' types, a cleared number as 0", () => {
    expect(draftContentOf({ ...TYPED, estimatedMinutes: "", coverImageUrl: "" })).toMatchObject({
      estimatedMinutes: 0,
      xpReward: 60,
      coverImageUrl: null,
    });
    expect(wholeNumber("12.5")).toBe(0);
    expect(wholeNumber(" 20 ")).toBe(20);
  });

  it("keeps a number past the publish's bound, for the publish to refuse by name", () => {
    expect(draftContentOf({ ...TYPED, estimatedMinutes: "700", xpReward: "20000" })).toMatchObject({
      estimatedMinutes: 700,
      xpReward: 20_000,
    });
    // Past what the column holds, it is saved as the most it holds.
    expect(wholeNumber("1e12")).toBe(2_147_483_647);
  });

  it("is the same lesson whatever the way a number was typed", () => {
    expect(sameContent({ ...PUBLISHED, estimatedMinutes: "015" }, PUBLISHED)).toBe(true);
    expect(sameContent(TYPED, PUBLISHED)).toBe(false);
  });
});

describe("autosaveLabel", () => {
  const savedAt = new Date("2026-10-18T12:04:00.000Z");

  it("gives the time of the last save, in Paris", () => {
    expect(autosaveLabel({ status: "saved", savedAt, hasDraft: true, error: null })).toBe(
      "Brouillon enregistré à 14:04",
    );
  });

  it("says when nothing is drafted, and when something waits", () => {
    expect(autosaveLabel({ status: "idle", savedAt: null, hasDraft: false, error: null })).toBe(
      "Aucun brouillon : la leçon est telle qu'elle est publiée.",
    );
    expect(autosaveLabel({ status: "pending", savedAt, hasDraft: true, error: null })).toBe(
      "Modifications non enregistrées",
    );
  });

  it("says why a save failed", () => {
    expect(
      autosaveLabel({ status: "error", savedAt, hasDraft: true, error: "Réseau coupé." }),
    ).toBe("Réseau coupé.");
    expect(autosaveLabel({ status: "conflict", savedAt, hasDraft: true, error: null })).toContain(
      "recharge la page",
    );
  });
});

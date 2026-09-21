import { describe, expect, it } from "vitest";
import { FLAG_BUDGET, moderationNotice, surfaceNoun } from "./notice.js";

describe("surfaceNoun", () => {
  it("calls each surface what it is", () => {
    // "Ton message a été retiré" is wrong about a question, and being told the
    // wrong thing about your own writing is how a notice stops being read.
    expect(surfaceNoun("lesson.question")).toBe("ta question");
    expect(surfaceNoun("lesson.answer")).toBe("ta réponse");
    expect(surfaceNoun("forum.topic")).toBe("ton sujet");
    expect(surfaceNoun("forum.post")).toBe("ton message");
    expect(surfaceNoun("note.share")).toBe("ta note");
  });

  it("falls back to something true rather than to the key", () => {
    // Old rows carry surfaces this was never taught about. "ton message" is
    // vague; the key itself in the middle of a sentence is broken.
    expect(surfaceNoun("lesson.rating")).toBe("ton message");
    expect(surfaceNoun("")).toBe("ton message");
  });
});

describe("moderationNotice", () => {
  it("says the held message exists and that somebody will look", () => {
    const notice = moderationNotice({ stage: "held", surface: "forum.topic" });

    expect(notice.title).toBe("Ton sujet est en attente de validation");
    expect(notice.body).toContain("Personne d'autre ne la voit");
    expect(notice.body).toContain("un modérateur va la relire");
    // Not a verdict: nothing here says the message broke a rule.
    expect(notice.body).not.toContain("enfreint");
  });

  it("calls a false alarm a false alarm", () => {
    const notice = moderationNotice({ stage: "restored", surface: "lesson.answer" });

    expect(notice.title).toBe("Ta réponse est de nouveau visible");
    expect(notice.body).toContain("fausse alerte");
  });

  it("says plainly that the message is gone", () => {
    const notice = moderationNotice({ stage: "removed", surface: "lesson.question" });

    expect(notice.title).toBe("Ta question a été supprimée");
    expect(notice.body).toContain("supprimée");
    // No sanction mentioned when none was applied - inventing one would be a
    // second punishment nobody decided on.
    expect(notice.body).not.toContain("sanction");
  });

  it("names the sanction when there is one", () => {
    const notice = moderationNotice({
      stage: "removed",
      surface: "forum.post",
      sanctionLabel: "bannissement de 7 jours",
    });

    expect(notice.body).toContain("une sanction a été appliquée : bannissement de 7 jours");
  });

  it("treats an absent, null or empty sanction as no sanction", () => {
    // Three ways of saying "none", because all three reach it: the field is
    // optional, the database hands back null, and a form hands back "".
    const base = { stage: "removed", surface: "forum.post" } as const;
    const notices = [
      moderationNotice(base),
      moderationNotice({ ...base, sanctionLabel: null }),
      moderationNotice({ ...base, sanctionLabel: "" }),
    ];

    for (const notice of notices) {
      expect(notice.body).not.toContain("sanction");
    }
    // And they say the same thing, rather than three near-identical sentences.
    expect(new Set(notices.map((n) => n.body)).size).toBe(1);
  });

  it("never names the rule that fired, at any stage", () => {
    // Naming it turns the filter into a puzzle people retry until they beat.
    for (const stage of ["held", "restored", "removed"] as const) {
      const notice = moderationNotice({ stage, surface: "forum.post" });
      expect(`${notice.title} ${notice.body}`.toLowerCase()).not.toMatch(
        /règle |mot-clé|lexique|score/u,
      );
    }
  });

  it("leaves room to rephrase before it stops anybody", () => {
    // Somebody fixing an awkward sentence three times is not the case the
    // budget exists for.
    expect(FLAG_BUDGET).toBeGreaterThanOrEqual(3);
  });
});

describe("a share that did not happen", () => {
  it("does not promise a publication that is never coming", () => {
    // "en attente de validation" is true of a forum post, which exists hidden
    // and may come back. A refused share published nothing and never will.
    const notice = moderationNotice({ stage: "refused", surface: "note.share" });

    expect(notice.title).toBe("Ta note n'a pas été partagée");
    expect(notice.body).not.toContain("en attente");
    expect(notice.body).not.toContain("va la relire");
  });

  it("says the note is still theirs, which is the part that matters", () => {
    const notice = moderationNotice({ stage: "refused", surface: "note.share" });
    expect(notice.body).toContain("toujours là");
    expect(notice.body).toContain("repartager");
  });
});

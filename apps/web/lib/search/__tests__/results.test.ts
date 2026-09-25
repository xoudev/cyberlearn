import { describe, expect, it } from "vitest";
import type { SearchRows } from "@cyberlearn/db";
import { buildGroups, flatten } from "../results";

function rows(over: Partial<SearchRows> = {}): SearchRows {
  return { paths: [], lessons: [], notes: [], ...over };
}

const path = (n: number, title: string): SearchRows["paths"][number] => ({
  id: `p${String(n)}`,
  slug: `parcours-${String(n)}`,
  title,
  description: "Un parcours complet",
  category: "CYBERSEC",
  difficulty: "BEGINNER",
  estimatedHours: 6,
  lessonCount: 8,
});

const lesson = (n: number, title: string): SearchRows["lessons"][number] => ({
  id: `l${String(n)}`,
  slug: `lecon-${String(n)}`,
  title,
  description: "Une leçon du catalogue",
  category: "DEV",
  difficulty: "INTERMEDIATE",
  estimatedMinutes: 25,
});

const note = (n: number, lessonTitle: string, content: string): SearchRows["notes"][number] => ({
  id: `n${String(n)}`,
  content,
  wordCount: content.split(/\s+/u).length,
  updatedAt: new Date("2026-03-04T10:00:00Z"),
  lessonId: `lesson-${String(n)}`,
  lessonSlug: `lecon-${String(n)}`,
  lessonTitle,
  lessonCategory: "NETWORK",
});

describe("buildGroups", () => {
  it("puts the parcours first, then the leçons, then the notes", () => {
    // The point of the whole feature: when a term matches all three, the
    // parcours is what the reader is offered first.
    const groups = buildGroups(
      rows({
        paths: [path(1, "Injection SQL de bout en bout")],
        lessons: [lesson(1, "Injection SQL")],
        notes: [note(1, "Injection SQL", "mes notes sur l'injection")],
      }),
      "injection",
    );

    expect(groups.map((g) => g.kind)).toEqual(["path", "lesson", "note"]);
    expect(groups.map((g) => g.label)).toEqual(["Parcours", "Leçons", "Mes notes"]);
  });

  it("drops a kind entirely when it has no match, rather than showing an empty heading", () => {
    const groups = buildGroups(rows({ lessons: [lesson(1, "Injection SQL")] }), "injection");
    expect(groups.map((g) => g.kind)).toEqual(["lesson"]);
  });

  it("links each kind at the page that can show it", () => {
    const groups = buildGroups(
      rows({
        paths: [path(1, "Injection SQL de bout en bout")],
        lessons: [lesson(2, "Injection SQL")],
        notes: [note(3, "Injection SQL", "injection")],
      }),
      "injection",
    );
    const hrefs = flatten(groups).map((r) => r.href);

    expect(hrefs).toEqual(["/paths/parcours-1", "/lessons/lecon-2", "/notes?note=n3"]);
  });

  it("caps each kind, and keeps the best of each", () => {
    const groups = buildGroups(
      rows({
        lessons: [
          lesson(1, "Les bases de l'injection"),
          lesson(2, "Injection SQL"),
          lesson(3, "Injection XSS"),
          lesson(4, "Injection de commandes système"),
          lesson(5, "Injection LDAP"),
          lesson(6, "Injection NoSQL"),
          lesson(7, "Injection"),
        ],
      }),
      "injection",
      3,
    );

    const titles = groups[0]?.results.map((r) => r.title) ?? [];
    expect(titles).toHaveLength(3);
    expect(titles[0]).toBe("Injection");
    expect(titles).not.toContain("Les bases de l'injection");
  });

  it("shows a note as the piece of it that matched, not its first words", () => {
    const long = `${"rien ".repeat(60)}le chiffrement asymétrique ${"rien ".repeat(60)}`;
    const groups = buildGroups(rows({ notes: [note(1, "Cryptographie", long)] }), "asymetrique");

    const result = groups[0]?.results[0];
    expect(result?.title).toBe("Cryptographie");
    expect(result?.subtitle).toContain("asymétrique");
  });

  it("describes a parcours by what it costs to take it", () => {
    const groups = buildGroups(rows({ paths: [path(1, "Injection SQL")] }), "injection");
    expect(groups[0]?.results[0]?.meta).toBe("8 leçons · 6 h · Débutant");
  });

  it("finds a French title from an unaccented query, end to end", () => {
    const groups = buildGroups(rows({ lessons: [lesson(1, "Sécurité des réseaux")] }), "securite");
    expect(groups[0]?.results[0]?.title).toBe("Sécurité des réseaux");
  });

  it("returns nothing when the rows do not actually contain the term", () => {
    // The database narrows; the ranking still decides. A row that matched only
    // a stray character must not be shown as an answer.
    expect(buildGroups(rows({ lessons: [lesson(1, "Docker")] }), "injection")).toEqual([]);
  });
});

describe("what the app opens a result by", () => {
  it("gives a path's and a lesson's slug, and a note's lesson", () => {
    const groups = buildGroups(
      rows({
        paths: [path(1, "Injection SQL")],
        lessons: [lesson(2, "Injection SQL")],
        notes: [note(3, "Injection SQL", "injection")],
      }),
      "injection",
    );
    const refs = Object.fromEntries(
      groups.flatMap((g) => g.results).map((r) => [r.kind, r.ref] as const),
    );
    expect(refs).toEqual({ path: "parcours-1", lesson: "lecon-2", note: "lesson-3" });
  });
});

import { describe, expect, it } from "vitest";
import { csvCell, csvFile, CSV_BOM } from "../../files/csv.js";
import { gradebookDay, gradebookFilename, gradebookRows } from "../gradebook.js";

const ALICE = {
  id: "u1",
  displayName: "Alice Martin",
  username: "alice",
  level: 4,
  xpTotal: 620,
  streakDays: 3,
  lastActiveAt: new Date("2026-11-10T09:00:00Z"),
  completedLessons: 12,
};
const BOB = {
  id: "u2",
  displayName: "Bob",
  username: null,
  level: 1,
  xpTotal: 0,
  streakDays: 0,
  lastActiveAt: null,
  completedLessons: 0,
};
const WORK = [
  { lessonId: "l1", title: "Les permissions", dueAt: new Date("2026-11-20T22:59:00Z") },
  { lessonId: "l2", title: "Le pare-feu", dueAt: null },
];

describe("gradebookRows", () => {
  it("writes the header, then one line per student in the order given", () => {
    const rows = gradebookRows({
      students: [ALICE, BOB],
      work: WORK,
      completions: [
        {
          userId: "u1",
          lessonId: "l1",
          completedAt: new Date("2026-11-08T10:00:00Z"),
          quizCorrect: 4,
          quizTotal: 5,
        },
      ],
    });

    expect(rows[0]).toEqual([
      "Nom",
      "Pseudo",
      "Niveau",
      "XP",
      "Série (jours)",
      "Dernière activité",
      "Leçons terminées",
      "Travaux terminés",
      "Les permissions, pour le 20/11/2026 : terminée le",
      "Les permissions : quiz",
      "Le pare-feu : terminée le",
      "Le pare-feu : quiz",
    ]);
    expect(rows[1]).toEqual([
      "Alice Martin",
      "alice",
      "4",
      "620",
      "3",
      "10/11/2026",
      "12",
      "1/2",
      "08/11/2026",
      "4/5",
      "",
      "",
    ]);
    expect(rows[2]).toEqual(["Bob", "", "1", "0", "0", "", "0", "0/2", "", "", "", ""]);
  });

  it("leaves the score empty for a lesson finished without a quiz", () => {
    const rows = gradebookRows({
      students: [ALICE],
      work: [WORK[1]!],
      completions: [
        {
          userId: "u1",
          lessonId: "l2",
          completedAt: new Date("2026-11-08T10:00:00Z"),
          quizCorrect: null,
          quizTotal: null,
        },
      ],
    });
    expect(rows[1]?.slice(8)).toEqual(["08/11/2026", ""]);
  });

  it("says a completion with no date is one", () => {
    const rows = gradebookRows({
      students: [ALICE],
      work: [WORK[1]!],
      completions: [
        { userId: "u1", lessonId: "l2", completedAt: null, quizCorrect: 2, quizTotal: 2 },
      ],
    });
    expect(rows[1]?.slice(7)).toEqual(["1/1", "oui", "2/2"]);
  });

  it("counts a lesson set twice as one piece of work", () => {
    const rows = gradebookRows({
      students: [ALICE],
      work: [WORK[0]!, { ...WORK[0]!, dueAt: null }],
      completions: [],
    });
    expect(rows[0]).toHaveLength(10);
    expect(rows[1]?.[7]).toBe("0/1");
  });

  it("is only its fixed columns for a class with no work set", () => {
    const rows = gradebookRows({ students: [ALICE], work: [], completions: [] });
    expect(rows[0]).toHaveLength(8);
    expect(rows[1]?.[7]).toBe("0/0");
  });
});

describe("gradebookDay", () => {
  it("is the day in Paris, not in UTC", () => {
    // 23:30 UTC on the 10th is 00:30 on the 11th in Paris.
    expect(gradebookDay(new Date("2026-11-10T23:30:00Z"))).toBe("11/11/2026");
    expect(gradebookDay(null)).toBe("");
  });
});

describe("gradebookFilename", () => {
  it("names the class without accents or spaces, and the day", () => {
    expect(
      gradebookFilename("BTS SIO 2ème année / Groupe B", new Date("2026-11-11T08:00:00Z")),
    ).toBe("classe-bts-sio-2eme-annee-groupe-b-2026-11-11.csv");
  });

  it("never leaves the name empty, nor lets a quote or a line break through", () => {
    expect(gradebookFilename('"\r\n', new Date("2026-11-11T08:00:00Z"))).toBe(
      "classe-sans-nom-2026-11-11.csv",
    );
  });
});

describe("csv", () => {
  it("quotes every cell and doubles the quotes inside", () => {
    expect(csvCell('Dit "le Grand"')).toBe('"Dit ""le Grand"""');
  });

  it("keeps a spreadsheet from running a cell that starts like a formula", () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvCell("+33 6")).toBe('"\'+33 6"');
    expect(csvCell("-1")).toBe('"\'-1"');
    expect(csvCell("@alice")).toBe('"\'@alice"');
  });

  it("writes a file a French spreadsheet opens as columns", () => {
    expect(
      csvFile([
        ["Nom", "XP"],
        ["Alice", "620"],
      ]),
    ).toBe(`${CSV_BOM}"Nom";"XP"\r\n"Alice";"620"\r\n`);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildSheet,
  plainText,
  recapOf,
  sheetAsText,
  sheetFileName,
  sheetSummary,
  sheetTitle,
} from "./sheet";

/**
 * A module's revision sheet, built from the lessons' "à retenir" sections:
 * the bullets found, the Markdown taken out, a lesson without a section left
 * out, and the names the site puts on the file and the header.
 */

const GREP = `---
title: "grep"
---

Intro.

## les options

- \`-i\` ignore la casse.

## à retenir

- \`grep motif fichiers\` affiche les lignes qui contiennent le motif ; sans fichier, il filtre son entrée standard.
- Options : \`-i\` casse, \`-v\` inverser, \`-n\` numéros, **\`-c\`** compter.
- Code de retour : 0 trouvé, 1 rien, 2 erreur.
  Pour tester en silence, \`-q\`.
- [La page de manuel](https://example.org/grep) dit tout, *vraiment*.

## pour aller plus loin

- Pas un point à retenir.
`;

describe("recapOf", () => {
  it("takes the bullets under the heading, continuation lines joined, and stops at the next heading", () => {
    expect(recapOf(GREP)).toEqual([
      "grep motif fichiers affiche les lignes qui contiennent le motif ; sans fichier, il filtre son entrée standard.",
      "Options : -i casse, -v inverser, -n numéros, -c compter.",
      "Code de retour : 0 trouvé, 1 rien, 2 erreur. Pour tester en silence, -q.",
      "La page de manuel dit tout, vraiment.",
    ]);
  });

  it("reads the heading whatever its case, CRLF included, and stops at a component or a rule", () => {
    expect(
      recapOf('## À retenir\r\n\r\n- Un.\r\n- Deux.\r\n\r\n<Quiz id="q" />\r\n- Trois.'),
    ).toEqual(["Un.", "Deux."]);
    expect(recapOf("## à retenir\n\n1. Premier.\n2) Second.\n\n---\n\n- Pas lui.")).toEqual([
      "Premier.",
      "Second.",
    ]);
  });

  it("finds nothing in a lesson without the section", () => {
    expect(recapOf("## les options\n\n- `-i` ignore la casse.")).toEqual([]);
    expect(recapOf("")).toEqual([]);
  });
});

describe("plainText", () => {
  it("takes the marks out and keeps the words", () => {
    expect(
      plainText("Un **mot** en *italique*, du `code`, un [lien](https://x.y) et 2 \\* 3."),
    ).toBe("Un mot en italique, du code, un lien et 2 * 3.");
    expect(plainText("`ls *.txt` liste  les fichiers")).toBe("ls *.txt liste les fichiers");
  });
});

describe("buildSheet", () => {
  it("keeps one section per lesson with points, in order, and counts them", () => {
    const sheet = buildSheet({
      pathTitle: "Linux",
      moduleNumber: 3,
      moduleTitle: "Chercher dans les fichiers",
      lessons: [
        { title: "grep", contentMdx: GREP },
        { title: "Sans récapitulatif", contentMdx: "## intro\n\nRien." },
        { title: "find", contentMdx: "## à retenir\n\n- `find . -name` cherche.\n" },
      ],
    });
    expect(sheet.title).toBe("Module 03 · Chercher dans les fichiers");
    expect(sheet.sections.map((s) => s.lessonTitle)).toEqual(["grep", "find"]);
    expect(sheet.sections[1]?.points).toEqual(["find . -name cherche."]);
    expect(sheet.pointCount).toBe(5);
    expect(sheetSummary(sheet)).toBe("2 leçons, 5 points à retenir");
    expect(sheetAsText(sheet).split("\n").slice(0, 4)).toEqual([
      "Linux : Module 03 · Chercher dans les fichiers",
      "",
      "grep",
      "- grep motif fichiers affiche les lignes qui contiennent le motif ; sans fichier, il filtre son entrée standard.",
    ]);
    expect(sheetAsText(sheet).endsWith("- find . -name cherche.")).toBe(true);
  });

  it("names a module without a title by its number", () => {
    expect(sheetTitle(1, null)).toBe("Module 01");
    expect(sheetTitle(12, "  ")).toBe("Module 12");
    const sheet = buildSheet({ pathTitle: "P", moduleNumber: 1, moduleTitle: null, lessons: [] });
    expect(sheet.sections).toEqual([]);
    expect(sheetSummary(sheet)).toBe("0 leçon, 0 point à retenir");
  });
});

describe("sheetFileName", () => {
  it("writes an ASCII name a browser keeps", () => {
    expect(sheetFileName("fondamentaux-informatique", 3)).toBe(
      "cyberlearn-fondamentaux-informatique-module-03.pdf",
    );
    expect(sheetFileName("réseaux & co", 12)).toBe("cyberlearn-reseaux-co-module-12.pdf");
    expect(sheetFileName("", 1)).toBe("cyberlearn-parcours-module-01.pdf");
  });
});

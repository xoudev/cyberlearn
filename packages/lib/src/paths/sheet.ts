/**
 * A revision sheet: the "à retenir" points of every lesson of a module, in
 * one document. The site prints it as a PDF, the app shows it on screen; both
 * build it here, from the lessons' MDX, so they say the same thing.
 *
 * Pure: no database, no rendering. The caller hands the lessons of one
 * module, in the path's order, and gets the sections back.
 */

export interface SheetSource {
  title: string;
  contentMdx: string;
}

export interface SheetSection {
  lessonTitle: string;
  points: string[];
}

export interface RevisionSheet {
  pathTitle: string;
  /** 1-based, as shown: "Module 03". */
  moduleNumber: number;
  /** The module's own title; null for a path that has none. */
  moduleTitle: string | null;
  /** "Module 03 · Représenter l'information", or "Module 03". */
  title: string;
  /** One per lesson that has points, in the path's order. */
  sections: SheetSection[];
  pointCount: number;
}

const RECAP_HEADING = /^##\s+[àa]\s+retenir\s*$/iu;
const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/u;

/** Inline Markdown taken out: bold, italic, code marks, links; the words stay. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
    .replace(/`([^`]*)`/gu, "$1")
    .replace(/\*\*([^*]+)\*\*/gu, "$1")
    .replace(/__([^_]+)__/gu, "$1")
    .replace(/(?<![\w*])\*([^*\s][^*]*?)\*(?![\w*])/gu, "$1")
    .replace(/\\([\\`*_{}[\]()#+\-.!])/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * The points listed under the lesson's "## à retenir" heading: one per
 * bullet, a bullet's continuation lines joined to it, until the next heading,
 * a component tag or the end. None when the lesson has no such section.
 */
export function recapOf(contentMdx: string): string[] {
  const lines = contentMdx.replace(/\r\n/gu, "\n").split("\n");
  const start = lines.findIndex((line) => RECAP_HEADING.test(line));
  if (start === -1) return [];
  const points: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/u.test(line) || /^\s*</u.test(line) || /^---\s*$/u.test(line)) break;
    const bullet = BULLET.exec(line);
    if (bullet !== null) {
      const text = plainText(bullet[1] ?? "");
      if (text !== "") points.push(text);
      continue;
    }
    const last = points.length - 1;
    if (line.trim() !== "" && last >= 0)
      points[last] = `${points[last] ?? ""} ${plainText(line)}`.trim();
  }
  return points;
}

export function sheetTitle(moduleNumber: number, moduleTitle: string | null): string {
  const label = `Module ${String(moduleNumber).padStart(2, "0")}`;
  return moduleTitle === null || moduleTitle.trim() === ""
    ? label
    : `${label} · ${moduleTitle.trim()}`;
}

export function buildSheet(input: {
  pathTitle: string;
  moduleNumber: number;
  moduleTitle: string | null;
  lessons: readonly SheetSource[];
}): RevisionSheet {
  const sections = input.lessons
    .map((lesson) => ({ lessonTitle: lesson.title, points: recapOf(lesson.contentMdx) }))
    .filter((section) => section.points.length > 0);
  return {
    pathTitle: input.pathTitle,
    moduleNumber: input.moduleNumber,
    moduleTitle: input.moduleTitle,
    title: sheetTitle(input.moduleNumber, input.moduleTitle),
    sections,
    pointCount: sections.reduce((n, section) => n + section.points.length, 0),
  };
}

/** "cyberlearn-linux-module-03.pdf": ASCII only, for a Content-Disposition header. */
export function sheetFileName(pathSlug: string, moduleNumber: number): string {
  const slug = pathSlug
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .toLowerCase();
  return `cyberlearn-${slug || "parcours"}-module-${String(moduleNumber).padStart(2, "0")}.pdf`;
}

/** The sheet as plain text, to share or paste: the title, then each lesson and its points. */
export function sheetAsText(sheet: RevisionSheet): string {
  const lines = [`${sheet.pathTitle} : ${sheet.title}`, ""];
  for (const section of sheet.sections) {
    lines.push(section.lessonTitle);
    for (const point of section.points) lines.push(`- ${point}`);
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

/** "3 leçons, 17 points à retenir", for the sheet's header and the app's card. */
export function sheetSummary(sheet: Pick<RevisionSheet, "sections" | "pointCount">): string {
  const lessons = sheet.sections.length;
  const points = sheet.pointCount;
  return `${String(lessons)} leçon${lessons > 1 ? "s" : ""}, ${String(points)} point${points > 1 ? "s" : ""} à retenir`;
}

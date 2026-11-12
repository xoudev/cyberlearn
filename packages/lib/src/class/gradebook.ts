/**
 * A class's progress as a table a teacher can open in a spreadsheet: one line
 * per student, the figures the class page shows, then two columns for each
 * piece of work set, when it was finished and the quiz score it was finished
 * with.
 *
 * The class page answers "who has stalled" on screen. It could not be taken
 * anywhere: a teacher filling in a school report, or keeping a term's record,
 * copied the figures out by hand.
 *
 * Pure: the rows come from the database, the table from here, so what the
 * file says can be tested without either.
 */

export interface GradebookStudent {
  id: string;
  displayName: string;
  username: string | null;
  level: number;
  xpTotal: number;
  streakDays: number;
  lastActiveAt: Date | null;
  /** Every lesson finished, set by the class or not. */
  completedLessons: number;
}

export interface GradebookWork {
  lessonId: string;
  title: string;
  dueAt: Date | null;
}

export interface GradebookCompletion {
  userId: string;
  lessonId: string;
  completedAt: Date | null;
  quizCorrect: number | null;
  quizTotal: number | null;
}

export interface GradebookInput {
  students: readonly GradebookStudent[];
  work: readonly GradebookWork[];
  completions: readonly GradebookCompletion[];
}

const DAY = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** A day as it is written in France, on Paris time; empty for none. */
export function gradebookDay(date: Date | null): string {
  return date === null ? "" : DAY.format(date);
}

const FIXED_HEADER = [
  "Nom",
  "Pseudo",
  "Niveau",
  "XP",
  "Série (jours)",
  "Dernière activité",
  "Leçons terminées",
  "Travaux terminés",
] as const;

/** The two column titles of one piece of work: its deadline is said once, in the first. */
function workHeader(work: GradebookWork): [string, string] {
  const due = work.dueAt === null ? "" : `, pour le ${gradebookDay(work.dueAt)}`;
  return [`${work.title}${due} : terminée le`, `${work.title} : quiz`];
}

/**
 * The table, header first. Students in the order given; work in the order
 * given. A lesson set twice appears once: it is one piece of work.
 */
export function gradebookRows(input: GradebookInput): string[][] {
  const work = input.work.filter(
    (item, index, all) => all.findIndex((other) => other.lessonId === item.lessonId) === index,
  );
  const done = new Map(input.completions.map((c) => [`${c.userId}:${c.lessonId}`, c]));

  const header = [...FIXED_HEADER, ...work.flatMap(workHeader)];
  const rows = input.students.map((student) => {
    const cells = work.map((item) => done.get(`${student.id}:${item.lessonId}`));
    const finished = cells.filter((c) => c !== undefined).length;
    return [
      student.displayName,
      student.username ?? "",
      String(student.level),
      String(student.xpTotal),
      String(student.streakDays),
      gradebookDay(student.lastActiveAt),
      String(student.completedLessons),
      `${String(finished)}/${String(work.length)}`,
      ...cells.flatMap((c) =>
        c === undefined
          ? ["", ""]
          : [
              // A completion with no date is still one: say so rather than
              // leave the cell looking like work not done.
              c.completedAt === null ? "oui" : gradebookDay(c.completedAt),
              c.quizCorrect === null || c.quizTotal === null
                ? ""
                : `${String(c.quizCorrect)}/${String(c.quizTotal)}`,
            ],
      ),
    ];
  });
  return [header, ...rows];
}

/** The file's name: the class, made safe for a download header, and the day. */
export function gradebookFilename(className: string, now: Date): string {
  const slug = className
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 60);
  const day = now.toISOString().slice(0, 10);
  return `classe-${slug === "" ? "sans-nom" : slug}-${day}.csv`;
}

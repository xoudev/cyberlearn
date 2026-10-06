import type { KeyValueStorage } from "@/lib/migrating-storage";

/**
 * Reading without a network: a path's module saved on the phone, its lessons
 * kept whole (the same MDX the reader parses), to open in a train or a cellar.
 *
 * Pure: the storage is handed in, so the rules (what an index holds, what a
 * removal keeps, how much fits) are tested without a phone. The app binds it
 * to AsyncStorage in offline-store.ts. A lesson saved by two modules is kept
 * once and removed with the last of them.
 */

export interface OfflineLesson {
  id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
  contentMdx: string;
}

export interface OfflineModule {
  /** `${pathSlug}#${moduleNumber}` */
  key: string;
  pathSlug: string;
  pathTitle: string;
  /** 1-based, as the path page shows it. */
  moduleNumber: number;
  moduleTitle: string | null;
  /** In the path's order. */
  lessons: { slug: string; title: string }[];
  /** The space its lessons take, in characters of stored text. */
  size: number;
  /** ISO 8601 */
  savedAt: string;
}

export type SaveResult = { ok: true; module: OfflineModule } | { ok: false; error: string };

const INDEX_KEY = "cl-offline-index";
const LESSON_PREFIX = "cl-offline-lesson:";

/**
 * What the phone keeps at most. AsyncStorage on Android sits in a database
 * capped at 6 MB by default, shared with the session and the app's other
 * keys; four leave room for them. A module of eight lessons is about 300 KB.
 */
export const OFFLINE_BUDGET = 4 * 1024 * 1024;

export const FULL_MESSAGE =
  "Plus de place pour lire hors ligne : retire un module avant d'en enregistrer un autre.";

export function moduleKey(pathSlug: string, moduleNumber: number): string {
  return `${pathSlug}#${String(moduleNumber)}`;
}

function lessonKey(slug: string): string {
  return `${LESSON_PREFIX}${slug}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A saved module read back, or null for anything the app did not write. */
function toModule(value: unknown): OfflineModule | null {
  if (!isRecord(value)) return null;
  const { key, pathSlug, pathTitle, moduleNumber, moduleTitle, lessons, size, savedAt } = value;
  if (
    typeof key !== "string" ||
    typeof pathSlug !== "string" ||
    typeof pathTitle !== "string" ||
    typeof moduleNumber !== "number" ||
    (moduleTitle !== null && typeof moduleTitle !== "string") ||
    !Array.isArray(lessons) ||
    typeof size !== "number" ||
    typeof savedAt !== "string"
  ) {
    return null;
  }
  const list = lessons.flatMap((lesson): { slug: string; title: string }[] =>
    isRecord(lesson) && typeof lesson.slug === "string" && typeof lesson.title === "string"
      ? [{ slug: lesson.slug, title: lesson.title }]
      : [],
  );
  return { key, pathSlug, pathTitle, moduleNumber, moduleTitle, lessons: list, size, savedAt };
}

/** A saved lesson read back, or null for anything the app did not write. */
function toLesson(value: unknown): OfflineLesson | null {
  if (!isRecord(value)) return null;
  const { id, slug, title, category, difficulty, estimatedMinutes, xpReward, contentMdx } = value;
  if (
    typeof id !== "string" ||
    typeof slug !== "string" ||
    typeof title !== "string" ||
    typeof category !== "string" ||
    typeof difficulty !== "string" ||
    typeof estimatedMinutes !== "number" ||
    typeof xpReward !== "number" ||
    typeof contentMdx !== "string"
  ) {
    return null;
  }
  return { id, slug, title, category, difficulty, estimatedMinutes, xpReward, contentMdx };
}

async function readJson(store: KeyValueStorage, key: string): Promise<unknown> {
  try {
    const raw = await store.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    // Unreadable or not JSON: as if nothing were there.
    return null;
  }
}

async function readIndex(store: KeyValueStorage): Promise<OfflineModule[]> {
  const raw = await readJson(store, INDEX_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.map(toModule).filter((module): module is OfflineModule => module !== null);
}

async function writeIndex(store: KeyValueStorage, modules: OfflineModule[]): Promise<void> {
  await store.setItem(INDEX_KEY, JSON.stringify(modules));
}

/** The saved modules, the most recent first. */
export async function listModules(store: KeyValueStorage): Promise<OfflineModule[]> {
  const modules = await readIndex(store);
  return [...modules].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function readLesson(
  store: KeyValueStorage,
  slug: string,
): Promise<OfflineLesson | null> {
  return toLesson(await readJson(store, lessonKey(slug)));
}

/** The space all saved modules take, counted once per lesson. */
export function usedSpace(modules: readonly OfflineModule[]): number {
  return modules.reduce((n, module) => n + module.size, 0);
}

/**
 * Saves a module and its lessons, or replaces it when it is already saved
 * (a fresh copy). Refused when it would not fit.
 */
export async function saveModule(
  store: KeyValueStorage,
  meta: {
    pathSlug: string;
    pathTitle: string;
    moduleNumber: number;
    moduleTitle: string | null;
  },
  lessons: readonly OfflineLesson[],
  now: Date = new Date(),
): Promise<SaveResult> {
  if (lessons.length === 0)
    return { ok: false, error: "Ce module n'a pas de leçon à enregistrer." };
  const key = moduleKey(meta.pathSlug, meta.moduleNumber);
  const texts = lessons.map((lesson) => JSON.stringify(lesson));
  const size = texts.reduce((n, text) => n + text.length, 0);
  const others = (await readIndex(store)).filter((module) => module.key !== key);
  if (usedSpace(others) + size > OFFLINE_BUDGET) return { ok: false, error: FULL_MESSAGE };

  for (const [i, lesson] of lessons.entries()) {
    await store.setItem(lessonKey(lesson.slug), texts[i] ?? JSON.stringify(lesson));
  }
  const module: OfflineModule = {
    key,
    ...meta,
    lessons: lessons.map((lesson) => ({ slug: lesson.slug, title: lesson.title })),
    size,
    savedAt: now.toISOString(),
  };
  // The index last: an interrupted save leaves copies nobody lists, never an
  // entry that points at a lesson that is not there.
  await writeIndex(store, [...others, module]);
  return { ok: true, module };
}

/** Removes a module, and the lessons no other saved module still needs. */
export async function removeModule(store: KeyValueStorage, key: string): Promise<void> {
  const modules = await readIndex(store);
  const gone = modules.find((module) => module.key === key);
  if (gone === undefined) return;
  const rest = modules.filter((module) => module.key !== key);
  const kept = new Set(rest.flatMap((module) => module.lessons.map((lesson) => lesson.slug)));
  await writeIndex(store, rest);
  for (const lesson of gone.lessons) {
    if (!kept.has(lesson.slug)) await store.removeItem(lessonKey(lesson.slug));
  }
}

/**
 * Keeps a saved copy current: when a lesson read online is also saved, its
 * stored text is replaced by the one just read. Nothing is saved that was
 * not already.
 */
export async function refreshLesson(store: KeyValueStorage, lesson: OfflineLesson): Promise<void> {
  if ((await readLesson(store, lesson.slug)) === null) return;
  await store.setItem(lessonKey(lesson.slug), JSON.stringify(lesson));
}

/** "312 Ko", "1,2 Mo": the space shown to the reader. */
export function formatSize(size: number): string {
  if (size < 1024 * 1024) return `${String(Math.max(1, Math.round(size / 1024)))} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

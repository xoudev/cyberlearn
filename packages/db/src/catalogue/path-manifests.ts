/**
 * Reads and checks the catalogue's path manifests, content/paths/<slug>.json.
 *
 * Used by seed-paths and by the console's "Synchroniser avec le dépôt" page
 * (to create the paths, their modules and their lesson links, through
 * ./path-sync.ts), and by a unit test that fails the build on a manifest that
 * would sync wrong - so a mistake is caught when it is written, not when it
 * reaches production.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathManifestSchema, type PathManifest } from "@cyberlearn/types";

/**
 * content/paths, found by walking up from the working directory (as
 * seed-quizzes does), so it resolves whether the seed or the tests run from the
 * package or from the repository root.
 */
export function findPathManifestDir(from: string = process.cwd()): string | null {
  let dir = from;
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, "content", "paths");
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  return null;
}

export interface LoadedPathManifest {
  file: string;
  manifest: PathManifest;
}

/** A lesson of a manifest, in study order, with the module it is filed under. */
export interface ManifestLesson {
  refCode: string;
  /** 0-based index into manifest.modules. */
  moduleIndex: number;
}

export function manifestLessons(manifest: PathManifest): ManifestLesson[] {
  return manifest.modules.flatMap((module, moduleIndex) =>
    module.lessons.map((refCode) => ({ refCode, moduleIndex })),
  );
}

/**
 * The new catalogue numbers its paths from 101 and its lessons by path: path
 * CL-PATH-1PP owns CL-LSN-PPNNN. A lesson code that names another path is
 * almost always a copy-paste slip, and one that would be hard to see later.
 */
function expectedLessonPrefix(pathRefCode: string): string | null {
  const match = /^CL-PATH-1(\d{2})-V\d{2}$/.exec(pathRefCode);
  return match ? `CL-LSN-${match[1] ?? ""}` : null;
}

export function checkPathManifests(entries: { file: string; json: unknown }[]): {
  manifests: LoadedPathManifest[];
  errors: string[];
} {
  const manifests: LoadedPathManifest[] = [];
  const errors: string[] = [];
  const refCodes = new Map<string, string>();
  const slugs = new Map<string, string>();
  const lessonOwner = new Map<string, string>();

  for (const { file, json } of entries) {
    const parsed = pathManifestSchema.safeParse(json);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${file} : ${issue.path.join(".") || "(racine)"} : ${issue.message}`);
      }
      continue;
    }
    const manifest = parsed.data;

    if (file !== `${manifest.slug}.json`) {
      errors.push(`${file} : le fichier doit s'appeler ${manifest.slug}.json, comme son slug.`);
    }
    const sameRef = refCodes.get(manifest.refCode);
    if (sameRef) errors.push(`${file} : refCode ${manifest.refCode} déjà utilisé par ${sameRef}.`);
    refCodes.set(manifest.refCode, file);
    const sameSlug = slugs.get(manifest.slug);
    if (sameSlug) errors.push(`${file} : slug ${manifest.slug} déjà utilisé par ${sameSlug}.`);
    slugs.set(manifest.slug, file);

    const prefix = expectedLessonPrefix(manifest.refCode);
    for (const { refCode } of manifestLessons(manifest)) {
      const owner = lessonOwner.get(refCode);
      if (owner) errors.push(`${file} : ${refCode} appartient déjà au parcours de ${owner}.`);
      lessonOwner.set(refCode, file);
      if (prefix && /^CL-LSN-\d{5}-/.test(refCode) && !refCode.startsWith(prefix)) {
        errors.push(
          `${file} : ${refCode} ne commence pas par ${prefix}, le numéro de ce parcours.`,
        );
      }
    }
    manifests.push({ file, manifest });
  }
  return { manifests, errors };
}

/** Every manifest in `dir`, checked. A missing directory is an empty catalogue. */
export function loadPathManifests(dir: string | null = findPathManifestDir()): {
  manifests: LoadedPathManifest[];
  errors: string[];
} {
  if (dir === null) return { manifests: [], errors: [] };
  let files: string[];
  try {
    files = readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort();
  } catch {
    return { manifests: [], errors: [] };
  }
  const entries: { file: string; json: unknown }[] = [];
  const errors: string[] = [];
  for (const file of files) {
    try {
      entries.push({ file, json: JSON.parse(readFileSync(join(dir, file), "utf8")) as unknown });
    } catch (error) {
      errors.push(`${file} : JSON illisible (${error instanceof Error ? error.message : "?"}).`);
    }
  }
  const checked = checkPathManifests(entries);
  return { manifests: checked.manifests, errors: [...errors, ...checked.errors] };
}

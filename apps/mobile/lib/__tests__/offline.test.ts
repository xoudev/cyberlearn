import { describe, expect, it } from "vitest";
import type { KeyValueStorage } from "@/lib/migrating-storage";
import {
  FULL_MESSAGE,
  OFFLINE_BUDGET,
  formatSize,
  listModules,
  moduleKey,
  readLesson,
  refreshLesson,
  removeModule,
  saveModule,
  type OfflineLesson,
} from "../offline";

/**
 * A module saved for reading without a network: the lessons kept whole and
 * read back, a module re-saved in place, a lesson shared by two modules kept
 * until the last one goes, a budget that refuses what does not fit, and
 * whatever the storage holds that the app did not write ignored.
 */

function memory(): KeyValueStorage & { keys: () => string[] } {
  const map = new Map<string, string>();
  return {
    getItem: (key) => Promise.resolve(map.get(key) ?? null),
    setItem: (key, value) => {
      map.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      map.delete(key);
      return Promise.resolve();
    },
    keys: () => [...map.keys()].sort(),
  };
}

function lesson(slug: string, text = "## à retenir\n\n- Un point."): OfflineLesson {
  return {
    id: `id-${slug}`,
    slug,
    title: `Titre ${slug}`,
    category: "DEV",
    difficulty: "BEGINNER",
    estimatedMinutes: 20,
    xpReward: 100,
    contentMdx: text,
  };
}

const LINUX = { pathSlug: "linux", pathTitle: "Linux", moduleNumber: 3, moduleTitle: "Chercher" };

describe("saveModule and readLesson", () => {
  it("keeps the lessons whole and lists the module", async () => {
    const store = memory();
    const result = await saveModule(
      store,
      LINUX,
      [lesson("grep"), lesson("find")],
      new Date("2026-10-07T08:00:00Z"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.module).toMatchObject({
      key: "linux#3",
      pathTitle: "Linux",
      moduleNumber: 3,
      moduleTitle: "Chercher",
      lessons: [
        { slug: "grep", title: "Titre grep" },
        { slug: "find", title: "Titre find" },
      ],
      savedAt: "2026-10-07T08:00:00.000Z",
    });
    expect(result.module.size).toBeGreaterThan(0);
    expect(await readLesson(store, "grep")).toEqual(lesson("grep"));
    expect(await readLesson(store, "absente")).toBeNull();
    expect((await listModules(store)).map((m) => m.key)).toEqual(["linux#3"]);
  });

  it("replaces a module saved again, rather than listing it twice", async () => {
    const store = memory();
    await saveModule(store, LINUX, [lesson("grep")], new Date("2026-10-07T08:00:00Z"));
    await saveModule(
      store,
      LINUX,
      [lesson("grep", "Nouvelle version.")],
      new Date("2026-10-08T08:00:00Z"),
    );
    const modules = await listModules(store);
    expect(modules).toHaveLength(1);
    expect(modules[0]?.savedAt).toBe("2026-10-08T08:00:00.000Z");
    expect((await readLesson(store, "grep"))?.contentMdx).toBe("Nouvelle version.");
  });

  it("refuses an empty module and one that would not fit", async () => {
    const store = memory();
    expect(await saveModule(store, LINUX, [])).toEqual({
      ok: false,
      error: "Ce module n'a pas de leçon à enregistrer.",
    });
    const huge = lesson("enorme", "x".repeat(OFFLINE_BUDGET));
    expect(await saveModule(store, LINUX, [huge])).toEqual({ ok: false, error: FULL_MESSAGE });
    expect(store.keys()).toEqual([]);
  });

  it("lists the most recent first", async () => {
    const store = memory();
    await saveModule(store, LINUX, [lesson("grep")], new Date("2026-10-01T08:00:00Z"));
    await saveModule(
      store,
      { ...LINUX, moduleNumber: 4 },
      [lesson("sed")],
      new Date("2026-10-05T08:00:00Z"),
    );
    expect((await listModules(store)).map((m) => m.key)).toEqual(["linux#4", "linux#3"]);
  });
});

describe("removeModule", () => {
  it("removes a module, and keeps a lesson another saved module still needs", async () => {
    const store = memory();
    await saveModule(store, LINUX, [lesson("grep"), lesson("find")]);
    await saveModule(store, { ...LINUX, pathSlug: "blueteam", moduleNumber: 1 }, [lesson("grep")]);
    await removeModule(store, moduleKey("linux", 3));
    expect(await readLesson(store, "find")).toBeNull();
    expect(await readLesson(store, "grep")).not.toBeNull();
    await removeModule(store, "blueteam#1");
    expect(await readLesson(store, "grep")).toBeNull();
    expect(await listModules(store)).toEqual([]);
    await removeModule(store, "nulle-part#9");
  });
});

describe("refreshLesson", () => {
  it("updates a saved copy, and saves nothing that was not saved", async () => {
    const store = memory();
    await saveModule(store, LINUX, [lesson("grep")]);
    await refreshLesson(store, lesson("grep", "Corrigée."));
    expect((await readLesson(store, "grep"))?.contentMdx).toBe("Corrigée.");
    await refreshLesson(store, lesson("autre"));
    expect(await readLesson(store, "autre")).toBeNull();
  });
});

describe("what the storage holds", () => {
  it("ignores an index or a lesson the app did not write", async () => {
    const store = memory();
    await store.setItem("cl-offline-index", "pas du json");
    expect(await listModules(store)).toEqual([]);
    await store.setItem("cl-offline-index", JSON.stringify([{ key: 1 }, "x"]));
    expect(await listModules(store)).toEqual([]);
    await store.setItem("cl-offline-lesson:grep", JSON.stringify({ slug: "grep" }));
    expect(await readLesson(store, "grep")).toBeNull();
  });

  it("writes the space in French", () => {
    expect(formatSize(300)).toBe("1 Ko");
    expect(formatSize(312 * 1024)).toBe("312 Ko");
    expect(formatSize(1.25 * 1024 * 1024)).toBe("1,3 Mo");
  });
});

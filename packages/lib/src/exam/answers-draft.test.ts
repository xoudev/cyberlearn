import { describe, expect, it } from "vitest";
import {
  DRAFT_KEY_PREFIX,
  DRAFT_MAX_AGE_MS,
  clearDraft,
  draftKey,
  loadDraft,
  parseDraft,
  restoreExamAnswers,
  restoreMockAnswers,
  saveDraft,
  serializeDraft,
  type DraftStorage,
} from "./answers-draft";

/**
 * The answers of a copy not handed in yet, kept on the device. The exam used
 * to hold them in the screen's state alone: a reload took all of them, on the
 * exam that delivers the certificate.
 */

const NOW = Date.UTC(2026, 9, 22, 10, 0, 0);

/** A storage in memory, with the failures a real one has. */
function memoryStorage(initial: Record<string, string> = {}): DraftStorage & {
  data: Map<string, string>;
  failing: { reads: boolean; writes: boolean; keys: boolean };
} {
  const data = new Map(Object.entries(initial));
  const failing = { reads: false, writes: false, keys: false };
  return {
    data,
    failing,
    getItem: (key) => {
      if (failing.reads) return Promise.reject(new Error("unavailable"));
      return Promise.resolve(data.get(key) ?? null);
    },
    setItem: (key, value) => {
      if (failing.writes) return Promise.reject(new Error("full"));
      data.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      data.delete(key);
      return Promise.resolve();
    },
    keys: () => {
      if (failing.keys) return Promise.reject(new Error("unavailable"));
      return Promise.resolve([...data.keys()]);
    },
  };
}

describe("the draft's format", () => {
  it("gives back the answers it was given", () => {
    const raw = serializeDraft({ q1: "a", q2: "c" }, NOW);
    expect(parseDraft(raw, NOW + 60_000)).toEqual({ q1: "a", q2: "c" });
  });

  it("holds a mock exam's positions as numbers, zero included", () => {
    const raw = serializeDraft({ "0": 0, "1": 3 }, NOW);
    expect(parseDraft(raw, NOW)).toEqual({ "0": 0, "1": 3 });
  });

  it("is nothing when there is nothing", () => {
    expect(parseDraft(null, NOW)).toEqual({});
  });

  it("is nothing when the text is not a draft", () => {
    for (const raw of [
      "",
      "not json",
      "null",
      "[]",
      "42",
      JSON.stringify({ v: 2, savedAt: NOW, answers: { q1: "a" } }),
      JSON.stringify({ v: 1, savedAt: "now", answers: { q1: "a" } }),
      JSON.stringify({ v: 1, savedAt: NOW, answers: "q1" }),
      JSON.stringify({ v: 1, savedAt: NOW, answers: null }),
    ]) {
      expect(parseDraft(raw, NOW)).toEqual({});
    }
  });

  it("drops an answer that is neither an option's id nor a position", () => {
    const raw = JSON.stringify({
      v: 1,
      savedAt: NOW,
      answers: { ok: "a", position: 2, obj: { a: 1 }, list: ["a"], flag: true, half: 1.5, neg: -1 },
    });
    expect(parseDraft(raw, NOW)).toEqual({ ok: "a", position: 2 });
  });

  it("does not take a key such as __proto__ for anything but an answer", () => {
    const raw = '{"v":1,"savedAt":' + String(NOW) + ',"answers":{"__proto__":{"polluted":true}}}';
    const answers = parseDraft(raw, NOW);
    expect(answers).toEqual({});
    const fresh: { polluted?: boolean } = {};
    expect(fresh.polluted).toBeUndefined();
  });

  it("is nothing once it is older than a copy can be taken up again", () => {
    const raw = serializeDraft({ q1: "a" }, NOW);
    expect(parseDraft(raw, NOW + DRAFT_MAX_AGE_MS)).toEqual({ q1: "a" });
    expect(parseDraft(raw, NOW + DRAFT_MAX_AGE_MS + 1)).toEqual({});
  });

  it("is nothing when it claims to come from long after now", () => {
    const raw = serializeDraft({ q1: "a" }, NOW + DRAFT_MAX_AGE_MS + 1);
    expect(parseDraft(raw, NOW)).toEqual({});
  });

  it("is keyed by the kind of exam and the attempt", () => {
    expect(draftKey("exam", "a1")).toBe(`${DRAFT_KEY_PREFIX}exam:a1`);
    expect(draftKey("mock", "a1")).not.toBe(draftKey("exam", "a1"));
  });
});

describe("what the final exam's copy takes back", () => {
  const questions = [
    { id: "q1", options: [{ id: "a" }, { id: "b" }] },
    { id: "q2", options: [{ id: "c" }, { id: "d" }] },
  ];

  it("keeps the answers to the copy's own questions and options", () => {
    expect(restoreExamAnswers({ q1: "b", q2: "c" }, questions)).toEqual({ q1: "b", q2: "c" });
  });

  it("leaves out a question the copy does not have, or an option it does not offer", () => {
    // One unknown answer would make the server refuse the whole copy.
    expect(restoreExamAnswers({ q1: "z", q2: "d", q9: "a" }, questions)).toEqual({ q2: "d" });
  });

  it("leaves out an answer of the wrong kind", () => {
    expect(restoreExamAnswers({ q1: 0 }, questions)).toEqual({});
  });
});

describe("what a mock exam's copy takes back", () => {
  const questions = [
    { index: 0, options: ["x", "y", "z"] },
    { index: 1, options: ["x", "y"] },
  ];

  it("keeps the positions that exist", () => {
    expect(restoreMockAnswers({ "0": 2, "1": 0 }, questions)).toEqual({ "0": 2, "1": 0 });
  });

  it("leaves out a position past the options, a missing question or an option's id", () => {
    expect(restoreMockAnswers({ "0": 3, "1": "y", "5": 0 }, questions)).toEqual({});
  });
});

describe("the storage", () => {
  it("is read back for the same attempt, not another", async () => {
    const storage = memoryStorage();
    await saveDraft(storage, "exam", "a1", { q1: "a" }, NOW);
    expect(await loadDraft(storage, "exam", "a1", NOW)).toEqual({ q1: "a" });
    expect(await loadDraft(storage, "exam", "a2", NOW)).toEqual({});
    expect(await loadDraft(storage, "mock", "a1", NOW)).toEqual({});
  });

  it("is replaced by the latest answers", async () => {
    const storage = memoryStorage();
    await saveDraft(storage, "exam", "a1", { q1: "a" }, NOW);
    await saveDraft(storage, "exam", "a1", { q1: "b", q2: "c" }, NOW + 1000);
    expect(await loadDraft(storage, "exam", "a1", NOW + 2000)).toEqual({ q1: "b", q2: "c" });
  });

  it("is dropped once the copy is in", async () => {
    const storage = memoryStorage();
    await saveDraft(storage, "exam", "a1", { q1: "a" }, NOW);
    await clearDraft(storage, "exam", "a1");
    expect(await loadDraft(storage, "exam", "a1", NOW)).toEqual({});
    expect(storage.data.size).toBe(0);
  });

  it("drops the drafts of attempts nobody took up again, and no one else's keys", async () => {
    const storage = memoryStorage({
      [draftKey("exam", "old")]: serializeDraft({ q1: "a" }, NOW - DRAFT_MAX_AGE_MS - 1),
      [draftKey("mock", "damaged")]: "not json",
      [draftKey("exam", "recent")]: serializeDraft({ q1: "a" }, NOW - 60_000),
      "sb-session": "keep me",
    });
    await saveDraft(storage, "exam", "a1", { q1: "a" }, NOW);
    expect([...storage.data.keys()].sort()).toEqual(
      [draftKey("exam", "a1"), draftKey("exam", "recent"), "sb-session"].sort(),
    );
  });

  it("never throws when the storage cannot be read", async () => {
    const storage = memoryStorage();
    storage.failing.reads = true;
    expect(await loadDraft(storage, "exam", "a1", NOW)).toEqual({});
  });

  it("never throws when the storage cannot be written, such as one that is full", async () => {
    const storage = memoryStorage();
    storage.failing.writes = true;
    await expect(saveDraft(storage, "exam", "a1", { q1: "a" }, NOW)).resolves.toBeUndefined();
  });

  it("keeps the answers when only the tidying fails", async () => {
    const storage = memoryStorage();
    storage.failing.keys = true;
    await saveDraft(storage, "exam", "a1", { q1: "a" }, NOW);
    storage.failing.keys = false;
    expect(await loadDraft(storage, "exam", "a1", NOW)).toEqual({ q1: "a" });
  });
});

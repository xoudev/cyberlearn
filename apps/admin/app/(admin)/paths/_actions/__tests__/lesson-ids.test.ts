import { describe, expect, it } from "vitest";
import { MAX_PATH_LESSONS, readPathLessonIds } from "../lesson-ids";

const A = "6f1c2a1e-1b2c-4d3e-8f40-5a6b7c8d9e01";
const B = "6f1c2a1e-1b2c-4d3e-8f40-5a6b7c8d9e02";

function form(lessonIds?: string): FormData {
  const fd = new FormData();
  if (lessonIds !== undefined) fd.set("lessonIds", lessonIds);
  return fd;
}

describe("readPathLessonIds", () => {
  it("reads the ordered ids of the hidden field", () => {
    expect(readPathLessonIds(form(JSON.stringify([B, A])))).toEqual({ ok: true, ids: [B, A] });
  });

  it("reads a missing or empty field as a path without lessons", () => {
    expect(readPathLessonIds(form())).toEqual({ ok: true, ids: [] });
    expect(readPathLessonIds(form(""))).toEqual({ ok: true, ids: [] });
    expect(readPathLessonIds(form("[]"))).toEqual({ ok: true, ids: [] });
  });

  it("refuses what it cannot read, rather than emptying the path", () => {
    expect(readPathLessonIds(form("[not json"))).toEqual({
      ok: false,
      error: "Liste de leçons illisible.",
    });
    expect(readPathLessonIds(form(JSON.stringify({ ids: [A] }))).ok).toBe(false);
    expect(readPathLessonIds(form(JSON.stringify([A, 42]))).ok).toBe(false);
    expect(readPathLessonIds(form(JSON.stringify([A, "pas-un-id"]))).ok).toBe(false);
  });

  it("refuses a lesson listed twice", () => {
    expect(readPathLessonIds(form(JSON.stringify([A, A])))).toEqual({
      ok: false,
      error: "Une leçon figure deux fois.",
    });
  });

  it("refuses more lessons than a path holds", () => {
    const ids = Array.from(
      { length: MAX_PATH_LESSONS + 1 },
      (_, i) => `6f1c2a1e-1b2c-4d3e-8f40-${i.toString(16).padStart(12, "0")}`,
    );
    expect(readPathLessonIds(form(JSON.stringify(ids))).ok).toBe(false);
    expect(readPathLessonIds(form(JSON.stringify(ids.slice(1)))).ok).toBe(true);
  });

  it("refuses a file in place of the field", () => {
    const fd = new FormData();
    fd.set("lessonIds", new File(["[]"], "ids.json"));
    expect(readPathLessonIds(fd).ok).toBe(false);
  });
});

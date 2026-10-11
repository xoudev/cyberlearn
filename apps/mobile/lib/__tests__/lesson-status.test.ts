import { describe, expect, it } from "vitest";
import {
  inScope,
  MAX_SCOPE_IDS_IN_URL,
  scopeFitsUrl,
  STATUS_FILTER_LABEL,
  STATUS_FILTER_ORDER,
  statusScope,
} from "../lesson-status";

const PROGRESS = [
  { lessonId: "a", status: "COMPLETED" as const },
  { lessonId: "b", status: "IN_PROGRESS" as const },
  { lessonId: "c", status: "COMPLETED" as const },
];

describe("the catalogue's status filter in the app", () => {
  it("keeps every lesson with no status chosen", () => {
    expect(statusScope("ALL", PROGRESS)).toEqual({ kind: "all" });
  });

  it("keeps only the lessons in the chosen status", () => {
    expect(statusScope("COMPLETED", PROGRESS)).toEqual({ kind: "only", ids: ["a", "c"] });
    expect(statusScope("IN_PROGRESS", PROGRESS)).toEqual({ kind: "only", ids: ["b"] });
  });

  it("reads 'non commencées' as the site does: no progress row at all", () => {
    expect(statusScope("NOT_STARTED", PROGRESS)).toEqual({
      kind: "except",
      ids: ["a", "b", "c"],
    });
  });

  it("lists nothing in progress for a reader who has started nothing", () => {
    expect(statusScope("IN_PROGRESS", [])).toEqual({ kind: "only", ids: [] });
    expect(statusScope("NOT_STARTED", [])).toEqual({ kind: "except", ids: [] });
  });

  it("keeps, row by row, exactly what the query would have kept", () => {
    const ids = ["a", "b", "c", "d"];
    const keep = (status: Parameters<typeof statusScope>[0]): string[] =>
      ids.filter((id) => inScope(statusScope(status, PROGRESS), id));
    expect(keep("ALL")).toEqual(ids);
    expect(keep("COMPLETED")).toEqual(["a", "c"]);
    expect(keep("IN_PROGRESS")).toEqual(["b"]);
    expect(keep("NOT_STARTED")).toEqual(["d"]);
  });

  it("puts a short list of ids in the URL, and filters the rows past that", () => {
    const many = Array.from({ length: MAX_SCOPE_IDS_IN_URL + 1 }, (_, i) => ({
      lessonId: `l${String(i)}`,
      status: "COMPLETED" as const,
    }));
    expect(scopeFitsUrl(statusScope("ALL", many))).toBe(true);
    expect(scopeFitsUrl(statusScope("COMPLETED", PROGRESS))).toBe(true);
    expect(scopeFitsUrl(statusScope("NOT_STARTED", many.slice(1)))).toBe(true);
    expect(scopeFitsUrl(statusScope("NOT_STARTED", many))).toBe(false);
    expect(scopeFitsUrl(statusScope("COMPLETED", many))).toBe(false);
  });

  it("names every status it offers", () => {
    for (const status of STATUS_FILTER_ORDER) {
      expect(STATUS_FILTER_LABEL[status].length).toBeGreaterThan(0);
    }
  });
});

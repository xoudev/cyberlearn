import { describe, expect, it } from "vitest";
import { extendSession } from "../review-session";

const row = (scheduleId: string) => ({ scheduleId });

describe("extendSession", () => {
  it("keeps a row the reload no longer lists: it was just graded", () => {
    const session = [row("a"), row("b"), row("c")];
    expect(extendSession(session, [row("b"), row("c")])).toEqual(session);
  });

  it("keeps every row once nothing is left due", () => {
    const session = [row("a"), row("b")];
    expect(extendSession(session, [])).toEqual(session);
  });

  it("takes in the review the reload brings, after the rows shown", () => {
    const session = [row("a"), row("b")];
    expect(extendSession(session, [row("b"), row("d")]).map((r) => r.scheduleId)).toEqual([
      "a",
      "b",
      "d",
    ]);
  });

  it("returns the same session when the reload brings nothing new", () => {
    const session = [row("a"), row("b")];
    expect(extendSession(session, [row("a")])).toBe(session);
  });
});

// @vitest-environment jsdom
import React, { useEffect } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => {
  const params: { slug?: string } = { slug: "linux-grep" };
  return {
    params,
    recordExerciseAction:
      vi.fn<(input: unknown) => Promise<{ ok: boolean; created: boolean; xpGained: number }>>(),
  };
});

vi.mock("next/navigation", () => ({ useParams: () => m.params }));
vi.mock("../../_actions/record-exercise", () => ({
  recordExerciseAction: m.recordExerciseAction,
}));

const { useExerciseRecord } = await import("../use-exercise-record");

/** A component that reports the same exercise twice, and a second one once. */
function Reporter(): React.ReactElement {
  const record = useExerciseRecord();
  useEffect(() => {
    record("grep-logs", "TERMINAL");
    record("grep-logs", "TERMINAL");
    record("defi-1", "PYTHON");
  }, [record]);
  return <div />;
}

afterEach(cleanup);

beforeEach(() => {
  m.recordExerciseAction.mockReset();
  m.recordExerciseAction.mockResolvedValue({ ok: true, created: true, xpGained: 10 });
  m.params = { slug: "linux-grep" };
});

describe("useExerciseRecord", () => {
  it("records each exercise once, with the lesson read off the page's address", () => {
    render(<Reporter />);
    expect(m.recordExerciseAction).toHaveBeenCalledTimes(2);
    expect(m.recordExerciseAction).toHaveBeenCalledWith({
      slug: "linux-grep",
      exerciseId: "grep-logs",
      kind: "TERMINAL",
    });
    expect(m.recordExerciseAction).toHaveBeenCalledWith({
      slug: "linux-grep",
      exerciseId: "defi-1",
      kind: "PYTHON",
    });
  });

  it("records nothing where there is no lesson, as in the editor's preview", () => {
    m.params = {};
    render(<Reporter />);
    expect(m.recordExerciseAction).not.toHaveBeenCalled();
  });

  it("never lets a failure out", () => {
    m.recordExerciseAction.mockRejectedValue(new Error("offline"));
    expect(() => render(<Reporter />)).not.toThrow();
  });
});

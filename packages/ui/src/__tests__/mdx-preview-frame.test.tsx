import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PREVIEW_PAUSE_MS,
  useLessonPreview,
  usePreviewRefresh,
  type LessonPreviewAction,
  type MdxPreviewResult,
} from "../components/mdx-preview-frame";

/**
 * When the draft goes to the site: at once on opening, after each pause in
 * typing, on demand; never twice for the same text; and what the pane shows
 * meanwhile. The frame itself is an iframe the site fills; nothing to test
 * here but the address it is given.
 */

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function settle(ms = 0): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("usePreviewRefresh", () => {
  it("sends the draft at once when the pane opens, then after each pause in typing", async () => {
    const refresh = vi.fn(
      (mdx: string): Promise<MdxPreviewResult> =>
        Promise.resolve({ ok: true, url: `/preview/t#${String(mdx.length)}` }),
    );
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => usePreviewRefresh(value, { refresh }),
      { initialProps: { value: "# a" } },
    );

    expect(result.current.state.url).toBeNull();
    await settle();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenLastCalledWith("# a");
    expect(result.current.state).toMatchObject({ url: "/preview/t#3", stale: false, busy: false });

    // Typing: nothing goes until the pause, and the timer restarts on each key.
    rerender({ value: "# ab" });
    expect(result.current.state.stale).toBe(true);
    await settle(PREVIEW_PAUSE_MS - 100);
    rerender({ value: "# abc" });
    await settle(PREVIEW_PAUSE_MS - 100);
    expect(refresh).toHaveBeenCalledTimes(1);
    await settle(100);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenLastCalledWith("# abc");
    expect(result.current.state).toMatchObject({ url: "/preview/t#5", stale: false, version: 2 });
  });

  it("does not send the same text twice", async () => {
    const refresh = vi.fn(
      (): Promise<MdxPreviewResult> => Promise.resolve({ ok: true, url: "/preview/t" }),
    );
    const { rerender } = renderHook(
      ({ value }: { value: string }) => usePreviewRefresh(value, { refresh }),
      { initialProps: { value: "# a" } },
    );
    await settle();
    rerender({ value: "# ab" });
    rerender({ value: "# a" });
    await settle(PREVIEW_PAUSE_MS * 2);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("shows why a draft was refused, keeps the last page, and clears it once accepted", async () => {
    const refresh = vi
      .fn<(mdx: string) => Promise<MdxPreviewResult>>()
      .mockResolvedValueOnce({ ok: true, url: "/preview/t" })
      .mockResolvedValueOnce({ ok: false, error: "Section « un » : ligne 3, True n'existe pas." })
      .mockResolvedValueOnce({ ok: true, url: "/preview/t" });
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => usePreviewRefresh(value, { refresh }),
      { initialProps: { value: "# a" } },
    );
    await settle();
    rerender({ value: "# broken" });
    await settle(PREVIEW_PAUSE_MS);
    expect(result.current.state).toMatchObject({
      url: "/preview/t",
      error: "Section « un » : ligne 3, True n'existe pas.",
      stale: true,
      version: 1,
    });
    rerender({ value: "# fixed" });
    await settle(PREVIEW_PAUSE_MS);
    expect(result.current.state).toMatchObject({ error: null, stale: false, version: 2 });
  });

  it("sends on demand without waiting for the pause", async () => {
    const refresh = vi.fn(
      (): Promise<MdxPreviewResult> => Promise.resolve({ ok: true, url: "/preview/t" }),
    );
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => usePreviewRefresh(value, { refresh }),
      { initialProps: { value: "# a" } },
    );
    await settle();
    rerender({ value: "# ab" });
    act(() => {
      result.current.refreshNow();
    });
    await settle();
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenLastCalledWith("# ab");
  });

  it("carries the problems of each answer, and keeps them through a refusal that has none", async () => {
    const problem = { line: 3, column: 16, message: "« True » n'existe pas ici." };
    const refresh = vi
      .fn<(mdx: string) => Promise<MdxPreviewResult>>()
      .mockResolvedValueOnce({ ok: true, url: "/preview/t" })
      .mockResolvedValueOnce({
        ok: false,
        error: "La section « S » ne s'afficherait pas.",
        problems: [problem],
      })
      .mockRejectedValueOnce(new Error("network"));
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => usePreviewRefresh(value, { refresh }),
      { initialProps: { value: "# a" } },
    );
    expect(result.current.state.problems).toBeNull();
    await settle();
    expect(result.current.state.problems).toEqual([]);
    rerender({ value: "# broken" });
    await settle(PREVIEW_PAUSE_MS);
    expect(result.current.state.problems).toEqual([problem]);
    rerender({ value: "# broken again" });
    await settle(PREVIEW_PAUSE_MS);
    // The site did not answer: nothing is known of this draft, the last problems stand.
    expect(result.current.state.problems).toEqual([problem]);
  });

  it("turns a failed call into a message rather than an exception", async () => {
    const refresh = vi.fn((): Promise<MdxPreviewResult> => Promise.reject(new Error("network")));
    const { result } = renderHook(() => usePreviewRefresh("# a", { refresh }));
    await settle();
    expect(result.current.state.error).toContain("n'a pas répondu");
    expect(result.current.state.busy).toBe(false);
  });
});

describe("useLessonPreview", () => {
  it("hands the action the token it got back, so one preview is refreshed in place", async () => {
    const action = vi
      .fn<LessonPreviewAction>()
      .mockResolvedValueOnce({ ok: true, token: "t1", url: "/preview/t1" })
      .mockResolvedValueOnce({ ok: false, error: "refusé" })
      .mockResolvedValueOnce({
        ok: true,
        token: "t1",
        url: "/preview/t1",
        problems: [{ line: 2, column: 1, message: "Tiret cadratin." }],
      });
    const { result } = renderHook(() => useLessonPreview(action));

    await expect(result.current.refresh("# a")).resolves.toEqual({ ok: true, url: "/preview/t1" });
    await expect(result.current.refresh("# b")).resolves.toEqual({ ok: false, error: "refusé" });
    // A draft that renders can still break a rule: its problems come along.
    await expect(result.current.refresh("# c")).resolves.toEqual({
      ok: true,
      url: "/preview/t1",
      problems: [{ line: 2, column: 1, message: "Tiret cadratin." }],
    });

    expect(action.mock.calls.map(([input]) => input.token)).toEqual([null, "t1", "t1"]);
  });
});

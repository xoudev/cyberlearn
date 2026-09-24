// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The code a learner writes survives a reload.
 *
 * Reloading was the only way out when Python got stuck, and it threw the code
 * away. Now it is saved as it is typed, and put back when the lesson opens.
 */

let pathname = "/lessons/python-listes-tuples";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const { draftKey, readDraft, useCodeDraft, writeDraft } = await import("../code-draft");

const STARTER = "def solution(nombres):\n    pass";

beforeEach(() => {
  window.localStorage.clear();
  pathname = "/lessons/python-listes-tuples";
});
afterEach(() => {
  cleanup();
});

describe("useCodeDraft", () => {
  it("starts on the starter code when nothing was saved", () => {
    const { result } = renderHook(() => useCodeDraft("py-1", STARTER));
    expect(result.current.code).toBe(STARTER);
    expect(result.current.restored).toBe(false);
  });

  it("puts back what was typed before a reload", () => {
    const first = renderHook(() => useCodeDraft("py-1", STARTER));
    act(() => {
      first.result.current.setCode("def solution(nombres):\n    return sum(nombres)");
    });
    first.unmount();

    // The reload: a new mount of the same exercise on the same lesson.
    const second = renderHook(() => useCodeDraft("py-1", STARTER));
    expect(second.result.current.code).toBe("def solution(nombres):\n    return sum(nombres)");
    expect(second.result.current.restored).toBe(true);
  });

  it("changes the revision when a draft comes back, so the editor remounts with it", () => {
    writeDraft(window.localStorage, draftKey(pathname, "py-1"), "x = 1", STARTER);
    const { result } = renderHook(() => useCodeDraft("py-1", STARTER));
    expect(result.current.revision).toBe(1);
  });

  it("goes back to the starter code on reset, and forgets the draft", () => {
    const { result } = renderHook(() => useCodeDraft("py-1", STARTER));
    act(() => {
      result.current.setCode("x = 1");
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.code).toBe(STARTER);
    expect(readDraft(window.localStorage, draftKey(pathname, "py-1"))).toBeNull();
  });

  it("keeps each exercise, and each lesson, to itself", () => {
    const a = renderHook(() => useCodeDraft("py-1", STARTER));
    act(() => {
      a.result.current.setCode("a = 1");
    });
    const b = renderHook(() => useCodeDraft("py-2", STARTER));
    expect(b.result.current.code).toBe(STARTER);

    pathname = "/lessons/python-dictionnaires";
    const c = renderHook(() => useCodeDraft("py-1", STARTER));
    expect(c.result.current.code).toBe(STARTER);
  });
});

describe("storage that refuses", () => {
  it("does not break the lesson when localStorage throws", () => {
    const refusing = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(readDraft(refusing, "k")).toBeNull();
    expect(() => {
      writeDraft(refusing, "k", "x", STARTER);
    }).not.toThrow();
  });
});

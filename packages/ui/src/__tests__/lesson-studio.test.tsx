import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTOSAVE_PAUSE_MS,
  leavesForAppPage,
  useDraftAutosave,
  useSaveShortcut,
  useUnsavedChangesGuard,
  type AutosaveResult,
} from "../components/lesson-studio";

/**
 * What both lesson editors do around the editor: save the draft after each
 * pause, save on ⌘S, ask before leaving with something unsaved.
 */

async function settle(ms = 0): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const SAVED_AT = new Date("2026-10-18T12:00:00.000Z");

describe("useDraftAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(save: (value: { text: string }) => Promise<AutosaveResult>) {
    return renderHook(
      ({ value }: { value: { text: string } }) => useDraftAutosave({ value, save }),
      { initialProps: { value: { text: "a" } } },
    );
  }

  it("saves nothing for what the page opened with", async () => {
    const save = vi.fn(
      (): Promise<AutosaveResult> => Promise.resolve({ ok: true, savedAt: SAVED_AT }),
    );
    const { result } = setup(save);
    await settle(AUTOSAVE_PAUSE_MS * 2);
    expect(save).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ status: "idle", dirty: false });
  });

  it("saves once after the typing pauses, with the last value typed", async () => {
    const save = vi.fn(
      (): Promise<AutosaveResult> => Promise.resolve({ ok: true, savedAt: SAVED_AT }),
    );
    const { result, rerender } = setup(save);

    rerender({ value: { text: "ab" } });
    expect(result.current).toMatchObject({ status: "pending", dirty: true });
    await settle(AUTOSAVE_PAUSE_MS - 100);
    rerender({ value: { text: "abc" } });
    await settle(AUTOSAVE_PAUSE_MS - 100);
    expect(save).not.toHaveBeenCalled();
    await settle(100);

    expect(save).toHaveBeenCalledExactlyOnceWith({ text: "abc" });
    expect(result.current).toMatchObject({ status: "saved", dirty: false, savedAt: SAVED_AT });
  });

  it("saves nothing for a value put back as it was", async () => {
    const save = vi.fn(
      (): Promise<AutosaveResult> => Promise.resolve({ ok: true, savedAt: SAVED_AT }),
    );
    const { result, rerender } = setup(save);
    rerender({ value: { text: "ab" } });
    rerender({ value: { text: "a" } });
    await settle(AUTOSAVE_PAUSE_MS * 2);
    expect(save).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ status: "idle", dirty: false });
  });

  it("saves at once on flush, without waiting for the pause", async () => {
    const save = vi.fn(
      (): Promise<AutosaveResult> => Promise.resolve({ ok: true, savedAt: SAVED_AT }),
    );
    const { result, rerender } = setup(save);
    rerender({ value: { text: "ab" } });
    let flushed = false;
    await act(async () => {
      flushed = await result.current.flush();
    });
    expect(flushed).toBe(true);
    expect(save).toHaveBeenCalledExactlyOnceWith({ text: "ab" });
    // The pause that was running does not save it a second time.
    await settle(AUTOSAVE_PAUSE_MS * 2);
    expect(save).toHaveBeenCalledOnce();
  });

  it("saves one at a time, and what was typed during a save right after it", async () => {
    let release: (result: AutosaveResult) => void = () => undefined;
    const save = vi
      .fn<(value: { text: string }) => Promise<AutosaveResult>>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      )
      .mockResolvedValue({ ok: true, savedAt: SAVED_AT });
    const { result, rerender } = setup(save);

    rerender({ value: { text: "ab" } });
    await settle(AUTOSAVE_PAUSE_MS);
    expect(result.current.status).toBe("saving");
    rerender({ value: { text: "abc" } });
    await settle(AUTOSAVE_PAUSE_MS);
    // Still on its way: the second save waits for it.
    expect(save).toHaveBeenCalledOnce();

    await act(async () => {
      release({ ok: true, savedAt: SAVED_AT });
      await vi.advanceTimersByTimeAsync(0);
    });
    await settle(AUTOSAVE_PAUSE_MS);
    expect(save.mock.calls.map(([value]) => value.text)).toEqual(["ab", "abc"]);
    expect(result.current).toMatchObject({ status: "saved", dirty: false });
  });

  it("stops for good on a conflict, and says why", async () => {
    const save = vi.fn(
      (): Promise<AutosaveResult> =>
        Promise.resolve({ ok: false, error: "Modifié ailleurs.", conflict: true }),
    );
    const { result, rerender } = setup(save);
    rerender({ value: { text: "ab" } });
    await settle(AUTOSAVE_PAUSE_MS);
    expect(result.current).toMatchObject({
      status: "conflict",
      error: "Modifié ailleurs.",
      dirty: true,
    });
    rerender({ value: { text: "abc" } });
    await settle(AUTOSAVE_PAUSE_MS * 2);
    expect(save).toHaveBeenCalledOnce();
  });

  it("tries again on the next change after a failure, and on a thrown save", async () => {
    const save = vi
      .fn<(value: { text: string }) => Promise<AutosaveResult>>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue({ ok: true, savedAt: SAVED_AT });
    const { result, rerender } = setup(save);
    rerender({ value: { text: "ab" } });
    await settle(AUTOSAVE_PAUSE_MS);
    expect(result.current.status).toBe("error");
    expect(result.current.error).toContain("n'a pas abouti");

    rerender({ value: { text: "abc" } });
    await settle(AUTOSAVE_PAUSE_MS);
    expect(result.current).toMatchObject({ status: "saved", error: null });
  });

  it("takes a value as saved without saving it, after a publish or a discard", async () => {
    const save = vi.fn(
      (): Promise<AutosaveResult> => Promise.resolve({ ok: true, savedAt: SAVED_AT }),
    );
    const { result, rerender } = setup(save);
    rerender({ value: { text: "ab" } });
    act(() => {
      result.current.markSaved({ text: "ab" });
    });
    await settle(AUTOSAVE_PAUSE_MS * 2);
    expect(save).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ status: "idle", dirty: false });
  });

  it("drops what is pending on cancel", async () => {
    const save = vi.fn(
      (): Promise<AutosaveResult> => Promise.resolve({ ok: true, savedAt: SAVED_AT }),
    );
    const { result, rerender } = setup(save);
    rerender({ value: { text: "ab" } });
    await act(async () => {
      await result.current.cancel();
    });
    act(() => {
      result.current.markSaved({ text: "a" });
    });
    rerender({ value: { text: "a" } });
    await settle(AUTOSAVE_PAUSE_MS * 2);
    expect(save).not.toHaveBeenCalled();
  });

  describe("paused, as during a publish", () => {
    function setupPausable(save: (value: { text: string }) => Promise<AutosaveResult>) {
      return renderHook(
        ({ value, paused }: { value: { text: string }; paused: boolean }) =>
          useDraftAutosave({ value, save, paused }),
        { initialProps: { value: { text: "a" }, paused: false } },
      );
    }

    it("starts no save on a pause, and says what is typed is pending", async () => {
      const save = vi.fn(
        (): Promise<AutosaveResult> => Promise.resolve({ ok: true, savedAt: SAVED_AT }),
      );
      const { result, rerender } = setupPausable(save);
      rerender({ value: { text: "a" }, paused: true });
      rerender({ value: { text: "ab" }, paused: true });
      await settle(AUTOSAVE_PAUSE_MS * 3);
      expect(save).not.toHaveBeenCalled();
      expect(result.current).toMatchObject({ status: "pending", dirty: true });
    });

    it("holds a pause that was already running when it started", async () => {
      const save = vi.fn(
        (): Promise<AutosaveResult> => Promise.resolve({ ok: true, savedAt: SAVED_AT }),
      );
      const { rerender } = setupPausable(save);
      rerender({ value: { text: "ab" }, paused: false });
      await settle(AUTOSAVE_PAUSE_MS - 100);
      rerender({ value: { text: "ab" }, paused: true });
      await settle(AUTOSAVE_PAUSE_MS * 2);
      expect(save).not.toHaveBeenCalled();
    });

    it("saves what was typed meanwhile after the next pause once it ends", async () => {
      const save = vi.fn(
        (): Promise<AutosaveResult> => Promise.resolve({ ok: true, savedAt: SAVED_AT }),
      );
      const { result, rerender } = setupPausable(save);
      rerender({ value: { text: "ab" }, paused: true });
      await settle(AUTOSAVE_PAUSE_MS * 2);
      rerender({ value: { text: "ab" }, paused: false });
      await settle(AUTOSAVE_PAUSE_MS);
      expect(save).toHaveBeenCalledExactlyOnceWith({ text: "ab" });
      expect(result.current).toMatchObject({ status: "saved", dirty: false });
    });

    it("still saves on flush", async () => {
      const save = vi.fn(
        (): Promise<AutosaveResult> => Promise.resolve({ ok: true, savedAt: SAVED_AT }),
      );
      const { result, rerender } = setupPausable(save);
      rerender({ value: { text: "ab" }, paused: true });
      await act(async () => {
        await result.current.flush();
      });
      expect(save).toHaveBeenCalledExactlyOnceWith({ text: "ab" });
    });
  });
});

describe("useSaveShortcut", () => {
  function press(init: KeyboardEventInit): KeyboardEvent {
    const event = new KeyboardEvent("keydown", { cancelable: true, ...init });
    window.dispatchEvent(event);
    return event;
  }

  it("saves on ⌘S and on Ctrl+S, instead of the browser's save dialog", () => {
    const onSave = vi.fn();
    renderHook(() => {
      useSaveShortcut(onSave);
    });
    expect(press({ key: "s", metaKey: true }).defaultPrevented).toBe(true);
    expect(press({ key: "S", ctrlKey: true }).defaultPrevented).toBe(true);
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("leaves other keys, and a keystroke Monaco already handled, alone", () => {
    const onSave = vi.fn();
    renderHook(() => {
      useSaveShortcut(onSave);
    });
    press({ key: "s" });
    press({ key: "s", ctrlKey: true, shiftKey: true });
    const handled = new KeyboardEvent("keydown", { key: "s", ctrlKey: true, cancelable: true });
    handled.preventDefault();
    window.dispatchEvent(handled);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("listens only while enabled", () => {
    const onSave = vi.fn();
    renderHook(() => {
      useSaveShortcut(onSave, false);
    });
    press({ key: "s", ctrlKey: true });
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("useUnsavedChangesGuard", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  function leave(): Event {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event;
  }

  function link(href: string, attributes: Record<string, string> = {}): HTMLAnchorElement {
    const a = document.createElement("a");
    a.setAttribute("href", href);
    for (const [name, value] of Object.entries(attributes)) a.setAttribute(name, value);
    a.textContent = "lien";
    document.body.append(a);
    return a;
  }

  /**
   * Clicks, and says whether the guard held the click back. A click let
   * through is cancelled once it has bubbled up, so jsdom does not try to
   * follow the link, which it cannot.
   */
  function click(target: Element): { defaultPrevented: boolean } {
    const bubbled: { prevented?: boolean } = {};
    const last = (event: Event): void => {
      bubbled.prevented = event.defaultPrevented;
      event.preventDefault();
    };
    window.addEventListener("click", last);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    target.dispatchEvent(event);
    window.removeEventListener("click", last);
    return { defaultPrevented: bubbled.prevented ?? event.defaultPrevented };
  }

  it("raises the browser's dialog on leaving with something unsaved, and only then", () => {
    const { rerender } = renderHook(
      ({ dirty }: { dirty: boolean }) => {
        useUnsavedChangesGuard(dirty, "Quitter ?");
      },
      { initialProps: { dirty: false } },
    );
    expect(leave().defaultPrevented).toBe(false);
    rerender({ dirty: true });
    expect(leave().defaultPrevented).toBe(true);
  });

  it("asks before a link of the app, and stays when told to", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderHook(() => {
      useUnsavedChangesGuard(true, "Des modifications ne sont pas enregistrées.");
    });
    const event = click(link("/lessons"));
    expect(confirm).toHaveBeenCalledExactlyOnceWith("Des modifications ne sont pas enregistrées.");
    expect(event.defaultPrevented).toBe(true);
  });

  it("lets the link through once the author agrees", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderHook(() => {
      useUnsavedChangesGuard(true, "Quitter ?");
    });
    expect(click(link("/lessons")).defaultPrevented).toBe(false);
  });

  it("asks nothing when everything is saved", () => {
    const confirm = vi.spyOn(window, "confirm");
    renderHook(() => {
      useUnsavedChangesGuard(false, "Quitter ?");
    });
    expect(click(link("/lessons")).defaultPrevented).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("knows which links leave for another page of the app", () => {
    const here = window.location;
    expect(leavesForAppPage(link("/lessons"), here)).toBe(true);
    expect(leavesForAppPage(link(`${here.pathname}?tab=2`), here)).toBe(true);
    expect(leavesForAppPage(link("#versions"), here)).toBe(false);
    expect(leavesForAppPage(link(here.pathname), here)).toBe(false);
    expect(leavesForAppPage(link("/lessons", { target: "_blank" }), here)).toBe(false);
    expect(leavesForAppPage(link("/export.csv", { download: "" }), here)).toBe(false);
    // Another site unloads the page: beforeunload asks for it.
    expect(leavesForAppPage(link("https://example.org/"), here)).toBe(false);
  });
});

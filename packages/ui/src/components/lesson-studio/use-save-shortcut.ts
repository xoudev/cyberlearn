import { useEffect, useRef } from "react";

/**
 * ⌘S on a Mac, Ctrl+S elsewhere: the app saves, and the browser does not
 * offer to save the page as a file.
 *
 * Listened for on the window, which is where a keystroke in a plain field
 * ends up. Monaco takes the keyboard in the code view and keeps the keys it
 * has a command for (MdxEditorPanel's onSave); a keystroke it handled arrives
 * here already handled, and is left alone.
 */

export function isSaveShortcut(event: KeyboardEvent): boolean {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "s"
  );
}

export function useSaveShortcut(onSave: () => void, enabled = true): void {
  const latest = useRef(onSave);
  latest.current = onSave;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || !isSaveShortcut(event)) return;
      event.preventDefault();
      latest.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled]);
}

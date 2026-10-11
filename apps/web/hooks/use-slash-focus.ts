import { type RefObject, useEffect } from "react";

/**
 * "/" puts the cursor in a page's search box, as the box's placeholder says.
 *
 * Four search boxes opened with "/ rechercher…" and none of them listened for
 * it. One hook so the four behave alike, and so the rules for when the key is
 * someone else's live in one place.
 */

/**
 * Where a "/" belongs to what has the focus: text in a field, a letter of a
 * dropdown's type-ahead, a key of a dialog that covers the box.
 */
const OWNS_THE_KEY = [
  "input",
  "textarea",
  "select",
  '[contenteditable]:not([contenteditable="false"])',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="dialog"]',
].join(", ");

/** Whether a key press is the "/" hotkey rather than a character for something else. */
export function isSlashHotkey(event: KeyboardEvent): boolean {
  if (event.key !== "/" || event.defaultPrevented || event.isComposing) return false;
  // Shift is allowed: on an AZERTY keyboard "/" is Shift plus the ":" key.
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  const target = event.target;
  return !(target instanceof Element) || target.closest(OWNS_THE_KEY) === null;
}

export function useSlashFocus(ref: RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const input = ref.current;
      if (input === null || input.disabled || !isSlashHotkey(event)) return;
      // A modal covers the page, wherever the focus is: the box is under it.
      if (document.querySelector('[aria-modal="true"]') !== null) return;
      event.preventDefault();
      input.focus();
      input.select();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [ref]);
}

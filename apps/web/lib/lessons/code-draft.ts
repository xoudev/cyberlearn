"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * What a learner typed in a lesson's editor, kept in this browser.
 *
 * Reloading was the only cure when Python got stuck, and a reload threw away
 * the code. The draft survives it now: it is saved as it is typed and put back
 * when the lesson opens again. "Réinitialiser" returns to the lesson's starter
 * code and forgets the draft.
 *
 * localStorage, not the database: a draft is a convenience of this device,
 * and can be lost (private window, cleared data) without losing anything
 * that counts. Every access is guarded for exactly that reason.
 */

const PREFIX = "cl:code-draft:v1:";

export function draftKey(pathname: string, exerciseId: string): string {
  return `${PREFIX}${pathname}#${exerciseId}`;
}

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function storage(): DraftStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readDraft(store: DraftStorage | null, key: string): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Saves the code, or forgets it when it is the starter code again. */
export function writeDraft(
  store: DraftStorage | null,
  key: string,
  code: string,
  starter: string,
): void {
  try {
    if (code === starter) store?.removeItem(key);
    else store?.setItem(key, code);
  } catch {
    // Full or refused: the draft is a convenience, the lesson goes on.
  }
}

export interface CodeDraft {
  code: string;
  setCode: (code: string) => void;
  /** Back to the starter code; the draft is forgotten. */
  reset: () => void;
  /** True when the code on screen came back from a saved draft. */
  restored: boolean;
  /** Changes on reset, so an uncontrolled editor can be remounted. */
  revision: number;
}

export function useCodeDraft(exerciseId: string, starter: string): CodeDraft {
  const pathname = usePathname();
  const key = draftKey(pathname, exerciseId);
  // The server and the first client render show the starter code: the draft
  // only exists in this browser, and is read after hydration.
  const [code, setCodeState] = useState(starter);
  const [restored, setRestored] = useState(false);
  const [revision, setRevision] = useState(0);
  const loadedKey = useRef<string | null>(null);

  useEffect(() => {
    if (loadedKey.current === key) return;
    loadedKey.current = key;
    const saved = readDraft(storage(), key);
    if (saved !== null && saved !== starter) {
      setCodeState(saved);
      setRestored(true);
      setRevision((r) => r + 1);
    }
  }, [key, starter]);

  const setCode = useCallback(
    (next: string) => {
      setCodeState(next);
      writeDraft(storage(), key, next, starter);
    },
    [key, starter],
  );

  const reset = useCallback(() => {
    setCodeState(starter);
    setRestored(false);
    setRevision((r) => r + 1);
    writeDraft(storage(), key, starter, starter);
  }, [key, starter]);

  return { code, setCode, reset, restored, revision };
}

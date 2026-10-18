import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Saves a draft after each pause in typing, one save at a time, and says
 * where it stands.
 *
 * What is saved is compared as JSON with what was last saved, so a value put
 * back the way it was saves nothing, and the first render counts as saved:
 * opening a lesson writes no draft. A save that answers "conflict" (the draft
 * moved under this editor: another tab, another administrator) stops the
 * autosave for good; the page has to be reloaded to see what the other one
 * wrote. Any other failure waits for the next change, or for flush().
 */

/** How long the typing has to stop before the draft is saved. */
export const AUTOSAVE_PAUSE_MS = 2000;

export type AutosaveResult =
  | { ok: true; savedAt: Date }
  | { ok: false; error: string; conflict?: boolean };

export type AutosaveStatus =
  /** Nothing typed since the page opened, or since a publish or a discard. */
  | "idle"
  /** Typed, waiting for the pause. */
  | "pending"
  | "saving"
  | "saved"
  /** The last save failed; the next change, or a flush, tries again. */
  | "error"
  /** The draft moved under this editor: nothing is saved any more. */
  | "conflict";

export interface DraftAutosave<T> {
  status: AutosaveStatus;
  /** When the draft was last saved, by this editor or before it opened. */
  savedAt: Date | null;
  /** Why the last save failed. */
  error: string | null;
  /** Something typed is not saved yet. */
  dirty: boolean;
  /** Saves now what is pending; true once nothing is left unsaved. */
  flush: () => Promise<boolean>;
  /** Drops what is pending and waits for a save on its way. */
  cancel: () => Promise<void>;
  /** Takes `value` as saved without saving it: a publish or a discard put the server there. */
  markSaved: (value: T, savedAt?: Date | null) => void;
}

/** Said when a save threw instead of answering. */
export const AUTOSAVE_FAILED = "L'enregistrement n'a pas abouti. Réessaie dans un instant.";

interface Saved {
  status: AutosaveStatus;
  savedAt: Date | null;
  error: string | null;
}

export function useDraftAutosave<T>({
  value,
  save,
  delay = AUTOSAVE_PAUSE_MS,
  savedAt = null,
}: {
  value: T;
  save: (value: T) => Promise<AutosaveResult>;
  delay?: number;
  /** When the draft the page opened with was saved, if it opened with one. */
  savedAt?: Date | null;
}): DraftAutosave<T> {
  const key = useMemo(() => JSON.stringify(value), [value]);
  const [savedKey, setSavedKey] = useState(key);
  const [state, setState] = useState<Saved>({ status: "idle", savedAt, error: null });

  const saveRef = useRef(save);
  saveRef.current = save;
  const latest = useRef({ value, key });
  latest.current = { value, key };
  const savedKeyRef = useRef(savedKey);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopped = useRef(false);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const run = useCallback(async (): Promise<boolean> => {
    // One at a time: a save started while another is on its way waits for it,
    // then saves what is there by then, if anything.
    while (inFlight.current !== null) await inFlight.current;
    if (stopped.current) return false;
    const snapshot = latest.current;
    if (snapshot.key === savedKeyRef.current) return true;

    const attempt = (async (): Promise<boolean> => {
      setState((s) => ({ ...s, status: "saving", error: null }));
      let result: AutosaveResult;
      try {
        result = await saveRef.current(snapshot.value);
      } catch {
        result = { ok: false, error: AUTOSAVE_FAILED };
      }
      if (result.ok) {
        savedKeyRef.current = snapshot.key;
        setSavedKey(snapshot.key);
        setState({
          status: latest.current.key === snapshot.key ? "saved" : "pending",
          savedAt: result.savedAt,
          error: null,
        });
        return true;
      }
      const conflict = result.conflict === true;
      if (conflict) stopped.current = true;
      setState((s) => ({ ...s, status: conflict ? "conflict" : "error", error: result.error }));
      return false;
    })();
    inFlight.current = attempt;
    try {
      return await attempt;
    } finally {
      if (inFlight.current === attempt) inFlight.current = null;
    }
  }, []);

  useEffect(() => {
    if (stopped.current || key === savedKey) return;
    setState((s) =>
      s.status === "pending" || s.status === "saving" ? s : { ...s, status: "pending" },
    );
    timer.current = setTimeout(() => {
      timer.current = null;
      void run();
    }, delay);
    return clearTimer;
  }, [key, savedKey, delay, run, clearTimer]);

  const flush = useCallback(async (): Promise<boolean> => {
    clearTimer();
    return run();
  }, [clearTimer, run]);

  const cancel = useCallback(async (): Promise<void> => {
    clearTimer();
    while (inFlight.current !== null) await inFlight.current;
  }, [clearTimer]);

  const markSaved = useCallback(
    (saved: T, at: Date | null = null) => {
      clearTimer();
      stopped.current = false;
      const savedValueKey = JSON.stringify(saved);
      savedKeyRef.current = savedValueKey;
      setSavedKey(savedValueKey);
      setState({ status: at === null ? "idle" : "saved", savedAt: at, error: null });
    },
    [clearTimer],
  );

  const dirty = key !== savedKey;
  // Typed, then put back as it was: nothing is waiting any more.
  const status: AutosaveStatus =
    !dirty && state.status === "pending"
      ? state.savedAt === null
        ? "idle"
        : "saved"
      : state.status;

  return { status, savedAt: state.savedAt, error: state.error, dirty, flush, cancel, markSaved };
}

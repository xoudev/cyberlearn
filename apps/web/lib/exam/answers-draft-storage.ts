import type { DraftStorage } from "@cyberlearn/lib/exam/answers-draft";

/**
 * The browser's localStorage as the place an exam copy's answers are kept
 * (@cyberlearn/lib/exam/answers-draft). Every call is made when asked, so a
 * write is in place before the next line runs; a browser that refuses
 * localStorage (a private window, blocked site data) answers with a rejection,
 * which the draft's functions swallow: the exam goes on without a draft.
 */

function run<T>(operation: () => T): Promise<T> {
  try {
    return Promise.resolve(operation());
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error("localStorage unavailable"));
  }
}

export const browserDraftStorage: DraftStorage = {
  getItem: (key) => run(() => window.localStorage.getItem(key)),
  setItem: (key, value) =>
    run(() => {
      window.localStorage.setItem(key, value);
    }),
  removeItem: (key) =>
    run(() => {
      window.localStorage.removeItem(key);
    }),
  keys: () =>
    run(() => {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key !== null) keys.push(key);
      }
      return keys;
    }),
};

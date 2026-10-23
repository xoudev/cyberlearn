import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DraftStorage } from "@cyberlearn/lib/exam/answers-draft";

/**
 * The phone's AsyncStorage as the place an exam copy's answers are kept until
 * the hand-in. The rules (what is kept, for how long, what is handed back to a
 * copy taken up again) are the site's, shared in
 * `@cyberlearn/lib/exam/answers-draft`: this only binds them to the phone.
 *
 * A storage that fails never fails the exam; the answers are then in the
 * screen's state only, as they always were.
 */
export const examDraftStorage: DraftStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
  keys: () => AsyncStorage.getAllKeys(),
};

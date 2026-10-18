/**
 * What both lesson editors share around the editor itself: the console's
 * studio and a teacher's class editor.
 *
 * MdxEditorPanel is the editor (@cyberlearn/ui/mdx-editor). These are the
 * habits a writing tool owes its author whatever it saves into: ⌘S saves,
 * leaving with something unsaved asks first, and, where there is a draft to
 * save into, saving happens by itself after each pause.
 */

export {
  AUTOSAVE_FAILED,
  AUTOSAVE_PAUSE_MS,
  useDraftAutosave,
  type AutosaveResult,
  type AutosaveStatus,
  type DraftAutosave,
} from "./use-draft-autosave";
export { isSaveShortcut, useSaveShortcut } from "./use-save-shortcut";
export { leavesForAppPage, useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

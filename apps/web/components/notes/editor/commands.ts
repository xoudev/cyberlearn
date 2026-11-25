import { EditorSelection, type ChangeSpec } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { NoteColor } from "@cyberlearn/lib/notes/rich-markdown";

/**
 * Editing commands of the notes editor, for its toolbar and its shortcuts.
 * Each takes the view, changes the document in one transaction (one undo
 * step) and returns true, as CodeMirror's keymaps expect.
 */

/**
 * Wrap each selection in `before`/`after`, or unwrap it when it already is.
 * An empty selection inserts the markers around `placeholder`, selected.
 */
export function wrapSelection(
  view: EditorView,
  before: string,
  after: string = before,
  placeholder = "texte",
): boolean {
  const { state } = view;
  const tr = state.changeByRange((range) => {
    const text = state.sliceDoc(range.from, range.to);
    const outerFrom = range.from - before.length;
    const outerTo = range.to + after.length;
    if (
      outerFrom >= 0 &&
      state.sliceDoc(outerFrom, range.from) === before &&
      state.sliceDoc(range.to, outerTo) === after
    ) {
      return {
        changes: [
          { from: outerFrom, to: range.from },
          { from: range.to, to: outerTo },
        ],
        range: EditorSelection.range(outerFrom, range.to - before.length),
      };
    }
    const inner = text || placeholder;
    return {
      changes: { from: range.from, to: range.to, insert: `${before}${inner}${after}` },
      range: EditorSelection.range(
        range.from + before.length,
        range.from + before.length + inner.length,
      ),
    };
  });
  view.dispatch(state.update(tr, { scrollIntoView: true, userEvent: "input" }));
  view.focus();
  return true;
}

/** Colour the selection's text, or highlight it (background). */
export function colorSelection(view: EditorView, color: NoteColor, background: boolean): boolean {
  return wrapSelection(view, "[", `]{${background ? "fond-" : ""}${color}}`);
}

/** Remove a colour or highlight wrapping the selection, when there is one. */
export function clearColor(view: EditorView): boolean {
  const { state } = view;
  const tr = state.changeByRange((range) => {
    const lineObj = state.doc.lineAt(range.from);
    const text = lineObj.text;
    const re = /\[([^[\]\n]{1,300})\]\{(?:fond-)?[a-z]{3,10}\}|==([^=\n]{1,1000})==/g;
    for (const m of text.matchAll(re)) {
      const a = lineObj.from + m.index;
      const b = a + m[0].length;
      if (range.from >= a && range.to <= b) {
        const inner = m[1] ?? m[2] ?? "";
        return {
          changes: { from: a, to: b, insert: inner },
          range: EditorSelection.range(a, a + inner.length),
        };
      }
    }
    return { range };
  });
  view.dispatch(state.update(tr, { userEvent: "input" }));
  view.focus();
  return true;
}

/**
 * Give every line of the selection `prefix`, or take it off when they all
 * have it. A heading prefix replaces another heading's.
 */
export function toggleLinePrefix(view: EditorView, prefix: string): boolean {
  const { state } = view;
  const lines = new Map<number, { from: number; text: string }>();
  for (const range of state.selection.ranges) {
    for (let pos = range.from; pos <= range.to; ) {
      const ln = state.doc.lineAt(pos);
      lines.set(ln.number, { from: ln.from, text: ln.text });
      pos = ln.to + 1;
    }
  }
  const all = [...lines.values()];
  const isHeading = /^#{1,6} $/.test(prefix);
  const strip = (text: string): number => {
    if (isHeading) return /^#{1,6} /.exec(text)?.[0].length ?? 0;
    return text.startsWith(prefix) ? prefix.length : 0;
  };
  const allHave = all.every((l) => (isHeading ? l.text.startsWith(prefix) : strip(l.text) > 0));
  const changes: ChangeSpec[] = all.map((l) => {
    if (allHave) return { from: l.from, to: l.from + strip(l.text) };
    const existing = isHeading ? strip(l.text) : 0;
    return { from: l.from, to: l.from + existing, insert: prefix };
  });
  view.dispatch({ changes, userEvent: "input", scrollIntoView: true });
  view.focus();
  return true;
}

/** Number the selected lines `1. `, `2. `… or take the numbers off. */
export function toggleOrderedList(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  const first = state.doc.lineAt(range.from).number;
  const last = state.doc.lineAt(range.to).number;
  const lines = [];
  for (let n = first; n <= last; n += 1) lines.push(state.doc.line(n));
  const numbered = /^\d{1,9}\. /;
  const allHave = lines.every((l) => numbered.test(l.text));
  const changes = lines.map((l, i) =>
    allHave
      ? { from: l.from, to: l.from + (numbered.exec(l.text)?.[0].length ?? 0) }
      : { from: l.from, insert: `${String(i + 1)}. ` },
  );
  view.dispatch({ changes, userEvent: "input" });
  view.focus();
  return true;
}

/**
 * Insert a block (a code fence, a table, a callout) on its own lines at the
 * cursor, with a blank line around it, and select `select` inside it.
 */
export function insertBlock(view: EditorView, block: string, select?: string): boolean {
  const { state } = view;
  const pos = state.selection.main.head;
  const ln = state.doc.lineAt(pos);
  const atEmptyLine = ln.text.trim() === "";
  const from = atEmptyLine ? ln.from : ln.to;
  const before = from === 0 ? "" : atEmptyLine ? "\n" : "\n\n";
  const insert = `${before}${block}\n`;
  const offset = select ? insert.indexOf(select) : -1;
  view.dispatch({
    changes: { from, to: atEmptyLine ? ln.to : from, insert },
    selection:
      offset >= 0
        ? EditorSelection.range(from + offset, from + offset + (select ?? "").length)
        : EditorSelection.cursor(from + insert.length),
    userEvent: "input",
    scrollIntoView: true,
  });
  view.focus();
  return true;
}

/** Insert a link around the selection, with its address selected to type. */
export function insertLink(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  const label = state.sliceDoc(range.from, range.to) || "lien";
  const insert = `[${label}](https://)`;
  const urlFrom = range.from + label.length + 3;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: EditorSelection.range(urlFrom, urlFrom + "https://".length),
    userEvent: "input",
  });
  view.focus();
  return true;
}

/** Insert `[[` and open the completion of note titles. */
export function insertWikiLink(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  const label = state.sliceDoc(range.from, range.to);
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: `[[${label}]]` },
    selection: EditorSelection.cursor(range.from + 2 + label.length),
    userEvent: "input.type",
  });
  view.focus();
  return true;
}

const LIST_LINE = /^(\s*)([-*+]|(\d{1,9})([.)]))(\s+)(\[[ xX]\]\s+)?/;

/**
 * Enter on a list item continues the list (the next number, an open box for a
 * task); on an empty item it ends the list. Elsewhere it lets the default run.
 */
export function continueList(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  if (!range.empty) return false;
  const ln = state.doc.lineAt(range.head);
  const m = LIST_LINE.exec(ln.text);
  if (!m || range.head < ln.from + m[0].length) return false;
  if (ln.text.slice(m[0].length).trim() === "") {
    view.dispatch({
      changes: { from: ln.from, to: ln.to, insert: "" },
      selection: EditorSelection.cursor(ln.from),
      userEvent: "input",
    });
    return true;
  }
  const indent = m[1] ?? "";
  const marker = m[3] ? `${String(Number.parseInt(m[3], 10) + 1)}${m[4] ?? "."}` : (m[2] ?? "-");
  const task = m[6] ? "[ ] " : "";
  const insert = `\n${indent}${marker}${m[5] ?? " "}${task}`;
  view.dispatch({
    changes: { from: range.head, to: range.head, insert },
    selection: EditorSelection.cursor(range.head + insert.length),
    userEvent: "input",
    scrollIntoView: true,
  });
  return true;
}

/** Tab / Shift-Tab on list items nests or un-nests them; elsewhere Tab stays the browser's. */
export function indentListItem(view: EditorView, outdent: boolean): boolean {
  const { state } = view;
  const lines = [];
  const range = state.selection.main;
  const first = state.doc.lineAt(range.from).number;
  const last = state.doc.lineAt(range.to).number;
  for (let n = first; n <= last; n += 1) lines.push(state.doc.line(n));
  if (!lines.every((l) => LIST_LINE.test(l.text))) return false;
  const changes = lines.map((l) => {
    if (!outdent) return { from: l.from, insert: "  " };
    const spaces = /^ {1,2}|^\t/.exec(l.text)?.[0].length ?? 0;
    return { from: l.from, to: l.from + spaces };
  });
  view.dispatch({ changes, userEvent: "input" });
  return true;
}

/** Append `text` at the end of the note, on its own lines, and scroll to it. */
export function appendText(view: EditorView, text: string): void {
  const doc = view.state.doc;
  const trimmedEnd = doc.toString().replace(/\s+$/, "").length;
  const sep = trimmedEnd === 0 ? "" : "\n\n";
  const insert = `${sep}${text}\n`;
  view.dispatch({
    changes: { from: trimmedEnd, to: doc.length, insert },
    selection: EditorSelection.cursor(trimmedEnd + insert.length),
    userEvent: "input",
    scrollIntoView: true,
  });
}

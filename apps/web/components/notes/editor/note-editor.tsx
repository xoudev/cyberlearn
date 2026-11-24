"use client";

// Client boundary: CodeMirror lives in the DOM, and the toolbar, the preview
// and the modes are local state.

import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  autocompletion,
  completionKeymap,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import { drawSelection, EditorView, keymap, placeholder as placeholderExt } from "@codemirror/view";
import {
  Bold,
  CheckSquare,
  Code,
  Columns2,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  NotebookPen,
  Quote,
  SquareCode,
  Strikethrough,
  Table,
  Layers,
  LayoutTemplate,
  MessageSquareWarning,
  PenLine,
  Palette,
} from "lucide-react";
import {
  CALLOUT_KINDS,
  CALLOUT_LABELS,
  NOTE_COLOR_LABELS,
  NOTE_COLORS,
  normalizeNoteTitle,
  toggleTask,
  type CalloutKind,
  type NoteColor,
} from "@cyberlearn/lib/notes/rich-markdown";
import { RichNote } from "@/lib/markdown/render-rich-note";
import { markdownDecorations } from "./markdown-decorations";
import {
  appendText,
  clearColor,
  colorSelection,
  continueList,
  indentListItem,
  insertBlock,
  insertLink,
  insertWikiLink,
  toggleLinePrefix,
  toggleOrderedList,
  wrapSelection,
} from "./commands";
import { NOTE_TEMPLATES } from "./templates";
import "../rich-note.css";

export type EditorMode = "write" | "split" | "preview";

/** What the editor lets its parent do from outside: add a quote, replace the text. */
export interface NoteEditorHandle {
  appendText: (text: string) => void;
  setContent: (text: string) => void;
  focus: () => void;
}

export interface NoteEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  /** Note titles offered after `[[`. */
  linkTargets?: readonly string[] | undefined;
  /** Where a [[link]] goes in the preview; null when no note has that title. */
  resolveLink?: ((target: string) => string | null) | undefined;
  onOpenLink?: ((target: string) => void) | undefined;
  onCreateLink?: ((target: string) => void) | undefined;
  /** The longest note the server keeps: past it, typing stops. */
  maxLength: number;
  /** Called when an edit was refused for being past maxLength. */
  onLimit?: (() => void) | undefined;
  /** The lesson drawer's narrower editor: fewer tools on one line. */
  compact?: boolean | undefined;
  defaultMode?: EditorMode | undefined;
  ariaLabel: string;
  placeholder?: string | undefined;
  footer?: React.ReactNode;
  ref?: React.Ref<NoteEditorHandle> | undefined;
}

const MODE_KEY = "notes.editor-mode";

function readMode(fallback: EditorMode): EditorMode {
  try {
    const v = window.localStorage.getItem(MODE_KEY);
    return v === "write" || v === "split" || v === "preview" ? v : fallback;
  } catch {
    return fallback;
  }
}

function saveMode(mode: EditorMode): void {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Private window or blocked storage: the mode is only remembered for the visit.
  }
}

/** `[[…` before the cursor: offer the titles of the user's notes. */
function wikiCompletion(targets: () => readonly string[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const before = context.matchBefore(/\[\[[^[\]\n|]{0,200}$/);
    if (!before) return null;
    const typed = normalizeNoteTitle(before.text.slice(2));
    const options: Completion[] = targets()
      .filter((t) => normalizeNoteTitle(t).includes(typed))
      .slice(0, 40)
      .map((title) => ({
        label: title,
        type: "text",
        apply: (view, _completion, from, to) => {
          const closed = view.state.sliceDoc(to, to + 2) === "]]";
          const insert = closed ? title : `${title}]]`;
          view.dispatch({
            changes: { from, to, insert },
            selection: { anchor: from + title.length + 2 },
          });
        },
      }));
    return { from: before.from + 2, options, filter: false };
  };
}

function ToolButton({
  label,
  shortcut,
  onClick,
  children,
  pressed,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  children: React.ReactNode;
  pressed?: boolean;
}): React.JSX.Element {
  const title = shortcut ? `${label} (${shortcut})` : label;
  return (
    <button
      type="button"
      className="note-editor__tool"
      aria-label={title}
      title={title}
      aria-pressed={pressed}
      onMouseDown={(e) => {
        // Keep the editor's selection: the button acts on it.
        e.preventDefault();
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** A tool that opens a small menu under it. Closes on Escape and on a pick. */
function ToolMenu({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false); // DOM node from the event
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="note-editor__menu" ref={rootRef}>
      <button
        type="button"
        className="note-editor__tool"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        onClick={() => {
          setOpen((o) => !o);
        }}
      >
        {icon}
        <span aria-hidden="true" className="note-editor__caret">
          ▾
        </span>
      </button>
      {open ? (
        <div className="note-editor__popover" role="menu" aria-label={label}>
          {children(() => {
            setOpen(false);
          })}
        </div>
      ) : null}
    </div>
  );
}

const CODE_LANGS = ["bash", "python", "javascript", "sql", "c", "php", "http", "yaml", "json"];

const CALLOUT_TEMPLATE = (kind: CalloutKind): string =>
  `> [!${kind}] ${CALLOUT_LABELS[kind]}\n> Ton texte ici`;

/**
 * The notes editor: markdown source in CodeMirror, coloured as it is typed
 * (markdown-decorations), a toolbar for everything the notes' markdown knows,
 * and a preview drawn by the same renderer as the reader. Three modes: write,
 * side by side, preview; the choice is remembered on the device.
 */
export function NoteEditor({
  initialValue,
  onChange,
  linkTargets = [],
  resolveLink,
  onOpenLink,
  onCreateLink,
  maxLength,
  onLimit,
  compact = false,
  defaultMode,
  ariaLabel,
  placeholder = "Écris ta note… Markdown, `code`, [[lien vers une note]], question :: réponse",
  footer,
  ref,
}: NoteEditorProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [value, setValue] = useState(initialValue);
  const preview = useDeferredValue(value);
  const fallbackMode: EditorMode = defaultMode ?? (compact ? "write" : "split");
  const [mode, setMode] = useState<EditorMode>(fallbackMode);

  // Callbacks change identity on every render; the editor reads them through
  // refs. So does the text it starts from: a remount (React's strict mode in
  // development, a drawer reopened) starts from the latest, not the first.
  const initialRef = useRef(initialValue);
  initialRef.current = initialValue;
  const onChangeRef = useRef(onChange);
  const onLimitRef = useRef(onLimit);
  const targetsRef = useRef(linkTargets);
  useEffect(() => {
    onChangeRef.current = onChange;
    onLimitRef.current = onLimit;
    targetsRef.current = linkTargets;
  });

  useEffect(() => {
    if (!compact) setMode(readMode(fallbackMode));
  }, [compact, fallbackMode]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: initialRef.current,
        extensions: [
          history(),
          drawSelection(),
          EditorView.lineWrapping,
          highlightSelectionMatches(),
          placeholderExt(placeholder),
          markdownDecorations,
          autocompletion({
            override: [wikiCompletion(() => targetsRef.current)],
            icons: false,
            activateOnTyping: true,
          }),
          keymap.of([
            { key: "Enter", run: continueList },
            { key: "Tab", run: (v) => indentListItem(v, false) },
            { key: "Shift-Tab", run: (v) => indentListItem(v, true) },
            { key: "Mod-b", run: (v) => wrapSelection(v, "**") },
            { key: "Mod-i", run: (v) => wrapSelection(v, "*") },
            { key: "Mod-k", run: insertLink },
            { key: "Mod-e", run: (v) => wrapSelection(v, "`", "`", "code") },
            { key: "Mod-Shift-x", run: (v) => wrapSelection(v, "~~") },
            { key: "Mod-Shift-h", run: (v) => wrapSelection(v, "==") },
            { key: "Mod-Alt-1", run: (v) => toggleLinePrefix(v, "# ") },
            { key: "Mod-Alt-2", run: (v) => toggleLinePrefix(v, "## ") },
            { key: "Mod-Alt-3", run: (v) => toggleLinePrefix(v, "### ") },
            ...completionKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...defaultKeymap,
          ]),
          EditorState.transactionFilter.of((tr) => {
            if (
              tr.docChanged &&
              tr.newDoc.length > maxLength &&
              tr.newDoc.length > tr.startState.doc.length
            ) {
              onLimitRef.current?.();
              return [];
            }
            return tr;
          }),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            const text = update.state.doc.toString();
            setValue(text);
            onChangeRef.current(text);
          }),
          EditorView.contentAttributes.of({
            "aria-label": ariaLabel,
            "aria-multiline": "true",
            spellcheck: "true",
            lang: "fr",
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The editor is created once per mount: its parent keys it by note.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Replace the whole text; the cursor stays where it was, or goes to the end. */
  const replaceAll = useCallback((text: string, toEnd = false) => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === text) return;
    const anchor = toEnd ? text.length : Math.min(view.state.selection.main.head, text.length);
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
      selection: { anchor },
      scrollIntoView: toEnd,
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      appendText: (text: string) => {
        const view = viewRef.current;
        if (view) appendText(view, text);
      },
      setContent: (text: string) => {
        replaceAll(text, true);
      },
      focus: () => viewRef.current?.focus(),
    }),
    [replaceAll],
  );

  const run = (fn: (view: EditorView) => unknown): void => {
    const view = viewRef.current;
    if (view) fn(view);
  };

  const changeMode = (next: EditorMode): void => {
    setMode(next);
    if (!compact) saveMode(next);
    if (next !== "preview") window.setTimeout(() => viewRef.current?.focus(), 0);
  };

  const onToggleTask = useCallback(
    (line: number) => {
      replaceAll(toggleTask(viewRef.current?.state.doc.toString() ?? value, line));
    },
    [replaceAll, value],
  );

  const previewNode = useMemo(
    () => (
      <RichNote
        markdown={preview}
        resolveLink={resolveLink}
        onOpenLink={onOpenLink}
        onCreateLink={onCreateLink}
        onToggleTask={onToggleTask}
        className="note-editor__preview-body"
      />
    ),
    [preview, resolveLink, onOpenLink, onCreateLink, onToggleTask],
  );

  return (
    <div className={`note-editor${compact ? " note-editor--compact" : ""}`} data-mode={mode}>
      <div className="note-editor__toolbar" role="toolbar" aria-label="Mise en forme">
        <div className="note-editor__group">
          <ToolButton
            label="Titre 1"
            shortcut="Ctrl+Alt+1"
            onClick={() => {
              run((v) => toggleLinePrefix(v, "# "));
            }}
          >
            <Heading1 size={16} aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Titre 2"
            shortcut="Ctrl+Alt+2"
            onClick={() => {
              run((v) => toggleLinePrefix(v, "## "));
            }}
          >
            <Heading2 size={16} aria-hidden="true" />
          </ToolButton>
          {compact ? null : (
            <ToolButton
              label="Titre 3"
              shortcut="Ctrl+Alt+3"
              onClick={() => {
                run((v) => toggleLinePrefix(v, "### "));
              }}
            >
              <Heading3 size={16} aria-hidden="true" />
            </ToolButton>
          )}
        </div>
        <div className="note-editor__group">
          <ToolButton
            label="Gras"
            shortcut="Ctrl+B"
            onClick={() => {
              run((v) => wrapSelection(v, "**"));
            }}
          >
            <Bold size={16} aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Italique"
            shortcut="Ctrl+I"
            onClick={() => {
              run((v) => wrapSelection(v, "*"));
            }}
          >
            <Italic size={16} aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Barré"
            shortcut="Ctrl+Maj+X"
            onClick={() => {
              run((v) => wrapSelection(v, "~~"));
            }}
          >
            <Strikethrough size={16} aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Surligner"
            shortcut="Ctrl+Maj+H"
            onClick={() => {
              run((v) => wrapSelection(v, "=="));
            }}
          >
            <Highlighter size={16} aria-hidden="true" />
          </ToolButton>
          <ToolMenu label="Couleur" icon={<Palette size={16} aria-hidden="true" />}>
            {(close) => (
              <div className="note-editor__colors">
                <p className="note-editor__popover-label">Texte</p>
                <div className="note-editor__swatches">
                  {NOTE_COLORS.map((c: NoteColor) => (
                    <button
                      key={`fg-${c}`}
                      type="button"
                      role="menuitem"
                      className={`note-editor__swatch rnote-fg--${c}`}
                      aria-label={`Texte ${NOTE_COLOR_LABELS[c].toLowerCase()}`}
                      title={NOTE_COLOR_LABELS[c]}
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        run((v) => colorSelection(v, c, false));
                        close();
                      }}
                    >
                      A
                    </button>
                  ))}
                </div>
                <p className="note-editor__popover-label">Surligner</p>
                <div className="note-editor__swatches">
                  {NOTE_COLORS.map((c: NoteColor) => (
                    <button
                      key={`bg-${c}`}
                      type="button"
                      role="menuitem"
                      className={`note-editor__swatch note-editor__swatch--bg rnote-bg--${c}`}
                      aria-label={`Surligner en ${NOTE_COLOR_LABELS[c].toLowerCase()}`}
                      title={NOTE_COLOR_LABELS[c]}
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        run((v) => colorSelection(v, c, true));
                        close();
                      }}
                    >
                      A
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="note-editor__menu-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => {
                    run(clearColor);
                    close();
                  }}
                >
                  Retirer la couleur
                </button>
              </div>
            )}
          </ToolMenu>
        </div>
        <div className="note-editor__group">
          <ToolButton
            label="Liste à puces"
            onClick={() => {
              run((v) => toggleLinePrefix(v, "- "));
            }}
          >
            <List size={16} aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Liste numérotée"
            onClick={() => {
              run(toggleOrderedList);
            }}
          >
            <ListOrdered size={16} aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Case à cocher"
            onClick={() => {
              run((v) => toggleLinePrefix(v, "- [ ] "));
            }}
          >
            <CheckSquare size={16} aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Citation"
            onClick={() => {
              run((v) => toggleLinePrefix(v, "> "));
            }}
          >
            <Quote size={16} aria-hidden="true" />
          </ToolButton>
          <ToolMenu label="Encadré" icon={<MessageSquareWarning size={16} aria-hidden="true" />}>
            {(close) =>
              CALLOUT_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  role="menuitem"
                  className={`note-editor__menu-item note-editor__callout-item rnote-callout--${kind}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => {
                    run((v) => insertBlock(v, CALLOUT_TEMPLATE(kind), "Ton texte ici"));
                    close();
                  }}
                >
                  {CALLOUT_LABELS[kind]}
                </button>
              ))
            }
          </ToolMenu>
        </div>
        <div className="note-editor__group">
          <ToolButton
            label="Code en ligne"
            shortcut="Ctrl+E"
            onClick={() => {
              run((v) => wrapSelection(v, "`", "`", "code"));
            }}
          >
            <Code size={16} aria-hidden="true" />
          </ToolButton>
          <ToolMenu label="Bloc de code" icon={<SquareCode size={16} aria-hidden="true" />}>
            {(close) =>
              CODE_LANGS.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  role="menuitem"
                  className="note-editor__menu-item note-editor__menu-item--mono"
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => {
                    run((v) => insertBlock(v, `\`\`\`${lang}\n# ton code\n\`\`\``, "# ton code"));
                    close();
                  }}
                >
                  {lang}
                </button>
              ))
            }
          </ToolMenu>
          <ToolButton
            label="Lien"
            shortcut="Ctrl+K"
            onClick={() => {
              run(insertLink);
            }}
          >
            <Link2 size={16} aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Lien vers une note ([[ ]])"
            onClick={() => {
              run(insertWikiLink);
            }}
          >
            <NotebookPen size={16} aria-hidden="true" />
          </ToolButton>
          {compact ? null : (
            <ToolButton
              label="Tableau"
              onClick={() => {
                run((v) =>
                  insertBlock(
                    v,
                    "| Colonne | Colonne |\n| --- | --- |\n| Valeur | Valeur |",
                    "Colonne",
                  ),
                );
              }}
            >
              <Table size={16} aria-hidden="true" />
            </ToolButton>
          )}
          {compact ? null : (
            <ToolButton
              label="Séparateur"
              onClick={() => {
                run((v) => insertBlock(v, "---"));
              }}
            >
              <Minus size={16} aria-hidden="true" />
            </ToolButton>
          )}
          <ToolButton
            label="Carte de révision (question :: réponse)"
            onClick={() => {
              run((v) => insertBlock(v, "Question ? :: Réponse", "Question ?"));
            }}
          >
            <Layers size={16} aria-hidden="true" />
          </ToolButton>
          {compact ? null : (
            <ToolMenu label="Modèle" icon={<LayoutTemplate size={16} aria-hidden="true" />}>
              {(close) =>
                NOTE_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="menuitem"
                    className="note-editor__menu-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={() => {
                      run((v) => insertBlock(v, t.body));
                      close();
                    }}
                  >
                    <strong>{t.label}</strong>
                    <span>{t.description}</span>
                  </button>
                ))
              }
            </ToolMenu>
          )}
        </div>
        <div className="note-editor__modes" role="group" aria-label="Affichage">
          <ToolButton
            label="Écrire"
            pressed={mode === "write"}
            onClick={() => {
              changeMode("write");
            }}
          >
            <PenLine size={16} aria-hidden="true" />
          </ToolButton>
          {compact ? null : (
            <ToolButton
              label="Côte à côte"
              pressed={mode === "split"}
              onClick={() => {
                changeMode("split");
              }}
            >
              <Columns2 size={16} aria-hidden="true" />
            </ToolButton>
          )}
          <ToolButton
            label="Aperçu"
            pressed={mode === "preview"}
            onClick={() => {
              changeMode("preview");
            }}
          >
            <Eye size={16} aria-hidden="true" />
          </ToolButton>
        </div>
      </div>

      <div className="note-editor__panes">
        <div className="note-editor__source" ref={hostRef} hidden={mode === "preview"} />
        {mode === "write" ? null : (
          <div className="note-editor__preview" aria-label="Aperçu de la note">
            {preview.trim() ? (
              previewNode
            ) : (
              <p className="note-editor__empty">L&apos;aperçu apparaît ici.</p>
            )}
          </div>
        )}
      </div>
      {footer ? <div className="note-editor__footer">{footer}</div> : null}
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { saveNoteAction } from "@/app/(app)/notes/_actions/note-actions";

const HEX = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";

interface NoteDrawerProps {
  lessonId: string;
  lessonTitle: string;
  initialContent: string;
  initialWordCount: number;
}

type SaveStatus = "idle" | "saving" | "saved";

/** Small formatting-toolbar button. */
function ToolBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
      }}
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        display: "grid",
        placeItems: "center",
        width: 30,
        height: 28,
        background: "transparent",
        border: "none",
        color: "#B8B5D1",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        cursor: "pointer",
        borderRadius: 2,
      }}
    >
      {children}
    </button>
  );
}

export function NoteDrawer({
  lessonId,
  lessonTitle,
  initialContent,
  initialWordCount,
}: NoteDrawerProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [wordCount, setWordCount] = useState(initialWordCount);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(initialContent);

  // Debounced auto-save whenever the content differs from the last saved value.
  useEffect(() => {
    if (content === lastSaved.current) return;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void saveNoteAction({ lessonId, content }).then((res) => {
        if (res.ok) {
          lastSaved.current = content;
          setWordCount(res.wordCount ?? 0);
          setStatus("saved");
        } else {
          setStatus("idle");
        }
      });
    }, 700);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [content, lessonId]);

  // Wrap the current selection with markdown markers (bold, italic, code).
  const surround = useCallback((before: string, after = before) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || "texte";
    setContent(value.slice(0, s) + before + sel + after + value.slice(e));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  }, []);

  // Prefix the current line (heading, list item).
  const prefixLine = useCallback((prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, value } = ta;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    setContent(value.slice(0, lineStart) + prefix + value.slice(lineStart));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + prefix.length, s + prefix.length);
    });
  }, []);

  const width = expanded ? "min(760px, 96vw)" : "min(400px, 96vw)";

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
        }}
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 45,
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: open ? "#05041A" : "var(--cosmetic-accent)",
          background: open ? "var(--cosmetic-accent)" : "rgba(10,8,38,0.92)",
          border: `1px solid ${open ? "var(--cosmetic-accent)" : "#2A2560"}`,
          boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          aria-hidden="true"
        >
          <path d="M3 2h7l3 3v9H3z" strokeLinejoin="round" />
          <path d="M6 6h4M6 9h4" strokeLinecap="round" />
        </svg>
        {open ? "Notes ouvertes" : "Notes"}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          aria-hidden="true"
          onClick={() => {
            setOpen(false);
          }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 44 }}
        />
      )}

      {/* Drawer */}
      <aside
        aria-hidden={!open}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100dvh",
          width,
          zIndex: 46,
          background: "#08061c",
          borderLeft: "1px solid #2A2560",
          transform: open ? "translateX(0)" : "translateX(105%)",
          transition: "transform 240ms cubic-bezier(0.2,0.7,0.2,1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "18px 18px 16px",
            borderBottom: "1px solid #1F1B47",
          }}
        >
          <span
            style={{
              position: "relative",
              width: 26,
              height: 29,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background: "var(--cosmetic-accent)",
                clipPath: HEX,
                opacity: 0.9,
              }}
            />
            <span
              aria-hidden="true"
              style={{ position: "absolute", inset: 2, background: "#08061c", clipPath: HEX }}
            />
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="var(--cosmetic-accent)"
              strokeWidth={1.4}
              style={{ position: "relative" }}
              aria-hidden="true"
            >
              <path d="M3 2h7l3 3v9H3z" strokeLinejoin="round" />
              <path d="M6 6h4M6 9h4" strokeLinecap="round" />
            </svg>
          </span>
          <span
            style={{
              flex: 1,
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 15,
              color: "#F5F5FA",
            }}
          >
            Mes notes
          </span>
          <button
            type="button"
            onClick={() => {
              setExpanded((v) => !v);
            }}
            aria-label={expanded ? "Réduire" : "Agrandir"}
            style={hdrBtn}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.4}
              aria-hidden="true"
            >
              <path
                d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
            }}
            aria-label="Fermer"
            style={hdrBtn}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Linked-lesson badge */}
        <div style={{ padding: "12px 18px", borderBottom: "1px solid #1F1B47" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              background: "color-mix(in srgb, var(--cosmetic-accent) 5%, transparent)",
              border: "1px solid color-mix(in srgb, var(--cosmetic-accent) 18%, transparent)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#B8B5D1",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--cosmetic-accent)",
                flexShrink: 0,
              }}
            />
            Liée à cette leçon ·{" "}
            <b style={{ color: "var(--cosmetic-accent)", fontWeight: 600 }}>{lessonTitle}</b>
          </div>
        </div>

        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "8px 14px",
            borderBottom: "1px solid #1F1B47",
          }}
        >
          <ToolBtn
            label="Gras"
            onClick={() => {
              surround("**");
            }}
          >
            <b>B</b>
          </ToolBtn>
          <ToolBtn
            label="Italique"
            onClick={() => {
              surround("*");
            }}
          >
            <i>I</i>
          </ToolBtn>
          <ToolBtn
            label="Titre"
            onClick={() => {
              prefixLine("## ");
            }}
          >
            <b>H</b>
          </ToolBtn>
          <span
            style={{ width: 1, height: 16, background: "#2A2560", margin: "0 6px" }}
            aria-hidden="true"
          />
          <ToolBtn
            label="Code"
            onClick={() => {
              surround("`");
            }}
          >
            {"</>"}
          </ToolBtn>
          <ToolBtn
            label="Liste"
            onClick={() => {
              prefixLine("- ");
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.4}
              aria-hidden="true"
            >
              <path d="M6 4h8M6 8h8M6 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" strokeLinecap="round" />
            </svg>
          </ToolBtn>
        </div>

        {/* Editor */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
          }}
          placeholder={
            "# Titre de la note\n\nÉcris tes notes en markdown…\n\n- **gras**, *italique*, `code`"
          }
          spellCheck={false}
          style={{
            flex: 1,
            width: "100%",
            resize: "none",
            background: "transparent",
            border: "none",
            outline: "none",
            padding: "18px 18px",
            color: "#E6E4F0",
            fontFamily: "var(--font-mono)",
            fontSize: 13.5,
            lineHeight: 1.65,
            letterSpacing: "0.01em",
          }}
        />

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "12px 18px",
            borderTop: "1px solid #1F1B47",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#7F7BA9",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: status === "saving" ? "#FFB020" : "var(--cosmetic-accent)",
              }}
            />
            {status === "saving" ? "Enregistrement…" : "Sauvegardé auto"}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
            <span>
              {wordCount} mot{wordCount > 1 ? "s" : ""} · MD
            </span>
            <Link
              href="/notes"
              style={{
                color: "var(--cosmetic-accent)",
                textDecoration: "none",
                letterSpacing: "0.06em",
              }}
            >
              Toutes mes notes →
            </Link>
          </span>
        </div>
      </aside>
    </>
  );
}

const hdrBtn: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: 28,
  height: 28,
  background: "transparent",
  border: "1px solid #2A2560",
  color: "#8B88A8",
  cursor: "pointer",
  borderRadius: 2,
};

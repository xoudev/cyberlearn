"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchGroup, SearchKind, SearchResult } from "@/lib/search/results";
import { flatten } from "@/lib/search/results";

/**
 * The search box in the navbar, and what it now does.
 *
 * What it used to do: a GET form onto /lessons. The placeholder said "search
 * lessons, paths, badges" - in English, on a French site - and two of those
 * three were a promise it could not keep, because submitting it landed on the
 * lesson catalogue with ?q= and nothing else was ever consulted.
 *
 * It now queries paths, lessons and the reader's own notes as they type, shows
 * them grouped with parcours first, and is driven from the keyboard: ⌘K (or
 * Ctrl+K) from anywhere, arrows to walk the list, ↵ to open, esc to dismiss.
 */

const CAT_COLORS: Record<string, string> = {
  CYBERSEC: "#FF4757",
  DEV: "#6E8BFF",
  NETWORK: "#0AFFD4",
};

const KIND_MARK: Record<SearchKind, string> = {
  path: "M2 4 L7 1 L12 4 L12 10 L7 13 L2 10 Z",
  lesson: "M3 2h7l3 3v9H3z",
  note: "M3 2h9v12H3zM5 5h5M5 8h5M5 11h3",
};

const BORDER = "#2A2560";
const MUTED = "#6F6B99";

/** Long enough to stop typing, short enough not to feel like waiting. */
const DEBOUNCE_MS = 180;
/** Matches MIN_SEARCH_LENGTH on the server; below it, nothing is requested. */
const MIN_LENGTH = 2;

function KindGlyph({ kind }: { kind: SearchKind }): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d={KIND_MARK[kind]}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GlobalSearch(): React.ReactElement {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  /** The term the shown results belong to, so "no results" never lies mid-flight. */
  const [answered, setAnswered] = useState("");

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = flatten(groups);
  const trimmed = term.trim();

  // ── Query, debounced, with the previous request abandoned ────────────────
  useEffect(() => {
    if (trimmed.length < MIN_LENGTH) {
      setGroups([]);
      setAnswered("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { groups: [] }))
        .then((payload: { groups?: SearchGroup[] }) => {
          setGroups(payload.groups ?? []);
          setAnswered(trimmed);
          setCursor(0);
          setLoading(false);
        })
        .catch(() => {
          // An aborted request is the normal case here: the reader kept typing.
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  // ── ⌘K / Ctrl+K from anywhere, and a click outside to dismiss ────────────
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    }
    function onPointer(event: MouseEvent): void {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      inputRef.current?.blur();
      router.push(href);
    },
    [router],
  );

  function onInputKey(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (results.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setCursor((current) => {
        const next = event.key === "ArrowDown" ? current + 1 : current - 1;
        return (next + results.length) % results.length;
      });
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const target = results[cursor];
      // Nothing highlighted - or nothing found - still gets them somewhere:
      // the catalogue, with the term they typed.
      if (target) go(target.href);
      else if (trimmed.length > 0) go(`/lessons?q=${encodeURIComponent(trimmed)}`);
    }
  }

  const showPanel = open && trimmed.length >= MIN_LENGTH;
  const nothingFound = answered === trimmed && !loading && results.length === 0;
  let index = -1;

  return (
    <div
      ref={boxRef}
      className="hidden md:block"
      style={{ flex: 1, maxWidth: 480, margin: "0 auto", position: "relative" }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        style={{
          position: "absolute",
          left: 12,
          top: 17,
          transform: "translateY(-50%)",
          color: MUTED,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 11 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      <input
        ref={inputRef}
        type="search"
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onKeyDown={onInputKey}
        placeholder="Rechercher un parcours, une leçon, une note…"
        className="navbar-search-input"
        style={{
          width: "100%",
          height: 34,
          padding: "0 42px 0 36px",
          background: "rgba(5,4,26,0.8)",
          border: `1px solid ${BORDER}`,
          borderRadius: 2,
          color: "#F5F5FA",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          outline: "none",
        }}
        aria-label="Rechercher"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        aria-activedescendant={
          showPanel && results[cursor] ? `gs-opt-${String(cursor)}` : undefined
        }
      />

      <span
        style={{
          position: "absolute",
          right: 8,
          top: 17,
          transform: "translateY(-50%)",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: MUTED,
          border: `1px solid ${BORDER}`,
          padding: "1px 5px",
          borderRadius: 2,
          pointerEvents: "none",
          opacity: term.length > 0 ? 0 : 1,
          transition: "opacity 140ms ease",
        }}
      >
        ⌘K
      </span>

      {showPanel ? (
        <div id="global-search-results" role="listbox" aria-label="Résultats" className="gs-panel">
          {groups.map((group) => (
            <div key={group.kind}>
              <div className="gs-group-label">{group.label}</div>
              {group.results.map((result) => {
                index += 1;
                const position = index;
                return (
                  <SearchRow
                    key={`${result.kind}-${result.id}`}
                    result={result}
                    active={position === cursor}
                    optionId={`gs-opt-${String(position)}`}
                    onHover={() => {
                      setCursor(position);
                    }}
                    onPick={() => {
                      go(result.href);
                    }}
                  />
                );
              })}
            </div>
          ))}

          {nothingFound ? (
            <div className="gs-empty">
              Aucun résultat pour «&nbsp;{trimmed}&nbsp;»
              <button
                type="button"
                className="gs-empty-action"
                onClick={() => {
                  go(`/lessons?q=${encodeURIComponent(trimmed)}`);
                }}
              >
                Chercher dans le catalogue
              </button>
            </div>
          ) : null}

          {loading && results.length === 0 && !nothingFound ? (
            <div className="gs-empty">Recherche…</div>
          ) : null}

          {results.length > 0 ? (
            <div className="gs-footer">
              <span>↑↓ naviguer</span>
              <span>↵ ouvrir</span>
              <span>esc fermer</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SearchRow({
  result,
  active,
  optionId,
  onHover,
  onPick,
}: {
  result: SearchResult;
  active: boolean;
  optionId: string;
  onHover: () => void;
  onPick: () => void;
}): React.ReactElement {
  const color = result.category ? (CAT_COLORS[result.category] ?? "var(--cosmetic-accent)") : MUTED;
  return (
    <button
      type="button"
      id={optionId}
      role="option"
      aria-selected={active}
      className={`gs-row${active ? " gs-row--active" : ""}`}
      onMouseEnter={onHover}
      onClick={onPick}
    >
      <span className="gs-row-mark" style={{ color }}>
        <KindGlyph kind={result.kind} />
      </span>
      <span className="gs-row-text">
        <span className="gs-row-title">{result.title}</span>
        <span className="gs-row-sub">{result.subtitle}</span>
      </span>
      <span className="gs-row-meta">{result.meta}</span>
    </button>
  );
}

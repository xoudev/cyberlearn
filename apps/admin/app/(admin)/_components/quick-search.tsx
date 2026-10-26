"use client";

// "use client": a field that answers each keystroke, its keyboard shortcut,
// and the requests it sends and cancels.

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CONSOLE_SEARCH_DEBOUNCE_MS,
  type ConsoleSearchResults,
  fetchConsoleSearch,
  flattenGroups,
  matchDestinations,
  moveCursor,
  paletteGroups,
  remoteSearchTerm,
} from "@/lib/command-palette";
import { CONSOLE_DESTINATIONS } from "@/lib/console-nav";

/** Where the server search stands, for the term it was last asked about. */
type Remote =
  | { status: "idle" }
  | { status: "loading"; results: ConsoleSearchResults | null }
  | { status: "done"; results: ConsoleSearchResults }
  | { status: "error" };

/**
 * The quick search of the top bar, opened from anywhere with ⌘K or Ctrl+K.
 *
 * Pages and actions are matched as soon as something is typed. From two
 * characters on, the accounts, lessons and tickets are asked of the server
 * too, once typing pauses; each new keystroke cancels the request the last
 * one sent, so an answer for "am" never lands over the one for "amel". While
 * a request runs, the previous answer stays on screen rather than blinking
 * out.
 *
 * A combobox in the ARIA sense: the field keeps the focus, the arrow keys walk
 * one list across every group, and the field says which line is active.
 *
 * Below 768px the bar has no room for the field beside the menu and the
 * account, and it used to be hidden there, which left a phone with no search
 * across the console at all. A button of the touch size stands in for it and
 * opens the field over the whole bar; the field closes again when it loses the
 * focus, on Escape, and once a result is chosen.
 */
export function QuickSearch(): React.ReactElement {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // Narrow windows only: the field laid over the bar. Without the media query
  // it changes nothing, so a ⌘K on a wide window sets it harmlessly.
  const [overBar, setOverBar] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [remote, setRemote] = useState<Remote>({ status: "idle" });

  const term = remoteSearchTerm(query);

  useEffect(() => {
    if (term === null) {
      setRemote({ status: "idle" });
      return;
    }
    setRemote((current) => ({
      status: "loading",
      results: current.status === "done" || current.status === "loading" ? current.results : null,
    }));
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetchConsoleSearch(term, controller.signal).then(
        (results) => {
          setRemote({ status: "done", results });
        },
        () => {
          // A request cancelled by the next keystroke is not a failure.
          if (!controller.signal.aborted) setRemote({ status: "error" });
        },
      );
    }, CONSOLE_SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  const groups = useMemo(() => {
    const results = remote.status === "done" || remote.status === "loading" ? remote.results : null;
    return paletteGroups(matchDestinations(query, CONSOLE_DESTINATIONS), results);
  }, [query, remote]);
  const items = useMemo(() => flattenGroups(groups), [groups]);
  // Where each group starts in that one list, for its options' ids.
  const starts = useMemo(() => {
    let next = 0;
    return groups.map((group) => {
      const start = next;
      next += group.items.length;
      return start;
    });
  }, [groups]);
  const active = items.length === 0 ? -1 : Math.min(cursor, items.length - 1);
  const optionId = (index: number): string => `${listId}-option-${String(index)}`;

  // ⌘K / Ctrl+K puts the cursor in the field from anywhere in the console.
  // On a narrow window the field is not there until the bar shows it: the
  // effect below takes the focus once it is.
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOverBar(true);
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // The field laid over the bar is typed into at once: no second tap.
  useEffect(() => {
    if (overBar) inputRef.current?.focus();
  }, [overBar]);

  function close(): void {
    setOpen(false);
    setOverBar(false);
  }

  function go(href: string): void {
    close();
    setQuery("");
    inputRef.current?.blur();
    router.push(href);
  }

  const status =
    remote.status === "loading"
      ? "Recherche des comptes, leçons et tickets…"
      : remote.status === "error"
        ? "La recherche des comptes, leçons et tickets n'a pas abouti."
        : items.length === 0
          ? `Aucun résultat pour « ${query.trim()} ».`
          : null;
  const expanded = open && (items.length > 0 || status !== null);

  return (
    <>
      <button
        type="button"
        className="a-topbar-search-toggle"
        aria-label="Ouvrir la recherche rapide"
        aria-expanded={overBar}
        onClick={() => {
          setOverBar(true);
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="5" />
          <path d="M11 11 L14 14" />
        </svg>
      </button>
      <div className="a-topbar-search a-cmd" data-over-bar={overBar ? "true" : undefined}>
        <div className="a-topbar-search-box">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11 L14 14" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="Recherche rapide"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder="Rechercher une page, un compte, une leçon, un ticket…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
            }}
            onBlur={() => {
              // Delay so an option's click lands before the list unmounts.
              setTimeout(close, 120);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
                setCursor(moveCursor(active, 1, items.length));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setCursor(moveCursor(active, -1, items.length));
              } else if (event.key === "Enter") {
                const target = items[active];
                if (target !== undefined) {
                  event.preventDefault();
                  go(target.href);
                }
              } else if (event.key === "Escape") {
                close();
                inputRef.current?.blur();
              }
            }}
          />
          <span className="a-kbd" aria-hidden="true">
            ⌘K
          </span>
        </div>

        {expanded && (
          <div className="a-cmd-panel">
            <div id={listId} role="listbox" aria-label="Résultats de la recherche">
              {groups.map((group, groupIndex) => (
                <div
                  key={group.id}
                  role="group"
                  aria-labelledby={`${listId}-${group.id}`}
                  className="a-cmd-group"
                >
                  <div id={`${listId}-${group.id}`} className="a-cmd-group-label">
                    {group.label}
                  </div>
                  {group.items.map((item, position) => {
                    const itemIndex = (starts[groupIndex] ?? 0) + position;
                    return (
                      <div
                        key={item.key}
                        id={optionId(itemIndex)}
                        role="option"
                        aria-selected={itemIndex === active}
                        className="a-cmd-option"
                        onMouseEnter={() => {
                          setCursor(itemIndex);
                        }}
                        onMouseDown={(event) => {
                          // Before the field's blur closes the list.
                          event.preventDefault();
                          go(item.href);
                        }}
                      >
                        <span className="a-cmd-option-text">
                          <span className="a-cmd-option-label">{item.label}</span>
                          {item.sublabel !== undefined && (
                            <span className="a-cmd-option-sublabel">{item.sublabel}</span>
                          )}
                        </span>
                        <span className="a-cmd-hint" data-kind={item.hint}>
                          {item.hint}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {status !== null && (
              <p className="a-cmd-status" role="status">
                {status}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

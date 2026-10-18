"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { firstEnabled, fold, moveActive } from "./select-nav.js";

/**
 * A list of options several of which can be chosen, with a search field.
 *
 * The console picked lessons and paths in lists that closed after every
 * choice: adding five lessons to a path meant opening the list five times and
 * finding one's place in it again each time. This one stays open until the
 * person is done - Escape, Tab, a click elsewhere or the button that opened
 * it - and each click or Enter only ticks or unticks an option.
 *
 * The keyboard follows the ARIA combobox pattern with a multi-selectable
 * listbox: focus stays in the search field, the arrows move the highlighted
 * option, Enter toggles it. The values are kept in the order they were chosen,
 * which the caller may give a meaning (the console's first path names a
 * lesson's code), and each one submits under `name` the way checkboxes that
 * share a name do.
 */

export interface MultiSelectOption {
  value: string;
  label: string;
  /** Dimmed text after the label, also searched: a code, a status. */
  hint?: string;
  disabled?: boolean;
}

export interface MultiSelectProps {
  /** Never mutated, so a frozen list of constants is welcome. */
  options: readonly MultiSelectOption[];
  /** Controlled values, in the order they were chosen. */
  value?: readonly string[];
  /** Starting values when uncontrolled. */
  defaultValue?: readonly string[];
  onChange?: (values: string[]) => void;
  /** Each chosen value submits under this name. */
  name?: string;
  id?: string;
  disabled?: boolean;
  /** What the closed control reads when nothing is chosen. */
  placeholder?: string;
  searchPlaceholder?: string;
  /** Shown when the search matches nothing. */
  emptyText?: string;
  /** What the closed control reads once something is chosen. */
  summary?: (count: number) => string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** On the wrapper, for how the field sits among its neighbours. */
  className?: string;
  style?: React.CSSProperties;
}

/** The Select's palette, so the two read as one family. */
const C = {
  bg: "var(--cl-select-bg, var(--color-bg-sunken))",
  fg: "var(--cl-select-fg, var(--color-text-primary))",
  muted: "var(--cl-select-fg-muted, var(--color-text-muted))",
  border: "var(--cl-select-border, var(--color-border-default))",
  accent: "var(--cl-select-accent, var(--cosmetic-accent, var(--color-brand-turquoise)))",
  panel: "var(--cl-select-panel-bg, var(--color-bg-elevated))",
  option: "var(--cl-select-option-fg, var(--color-text-secondary))",
  active: "var(--cl-select-option-active-bg, #141040)",
  off: "var(--cl-select-option-disabled-fg, var(--color-text-faint))",
  font: "var(--font-mono, ui-monospace, monospace)",
} as const;

const LIST_MAX_HEIGHT = 280;

function defaultSummary(count: number): string {
  // "choix" is the same word for one and for several.
  return `${String(count)} choix`;
}

/** The options a search keeps: every word of it in the label or the hint. */
export function filterOptions(
  options: readonly MultiSelectOption[],
  query: string,
): MultiSelectOption[] {
  const words = fold(query).split(/\s+/u).filter(Boolean);
  if (words.length === 0) return [...options];
  return options.filter((option) => {
    const text = fold(`${option.label} ${option.hint ?? ""}`);
    return words.every((word) => text.includes(word));
  });
}

export function MultiSelect({
  options,
  value,
  defaultValue,
  onChange,
  name,
  id,
  disabled,
  placeholder = "Aucun choix",
  searchPlaceholder = "Rechercher…",
  emptyText = "Aucun résultat",
  summary = defaultSummary,
  className,
  style,
  ...aria
}: MultiSelectProps): React.JSX.Element {
  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const controlled = value !== undefined;
  const [ownValue, setOwnValue] = useState<readonly string[]>(defaultValue ?? []);
  const current = controlled ? value : ownValue;
  const chosen = useMemo(() => new Set(current), [current]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const visible = useMemo(() => filterOptions(options, query), [options, query]);
  const labelOf = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);

  const commit = useCallback(
    (next: string[]) => {
      if (!controlled) setOwnValue(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );

  const toggle = useCallback(
    (option: MultiSelectOption | undefined) => {
      if (!option || option.disabled === true) return;
      commit(
        chosen.has(option.value)
          ? current.filter((v) => v !== option.value)
          : [...current, option.value],
      );
    },
    [chosen, current, commit],
  );

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const openList = useCallback(() => {
    if (disabled === true) return;
    setActiveIndex(firstEnabled(options) ?? -1);
    setOpen(true);
  }, [disabled, options]);

  // Focus goes to the search field: that is where the keys are read.
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Node && wrapperRef.current?.contains(target) === true) return;
      close(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, close]);

  // Keep the highlighted option in view when the arrows walk past the edge.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current
      ?.querySelector(`[data-index="${String(activeIndex)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function onTriggerKeyDown(event: React.KeyboardEvent): void {
    if (open || disabled === true) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openList();
    }
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => moveActive(visible, i, 1) ?? i);
        return;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => moveActive(visible, i, -1) ?? i);
        return;
      case "Enter":
        // Never the form's submit: Enter here means "tick this one".
        event.preventDefault();
        toggle(visible[activeIndex]);
        return;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close(true);
        return;
      case "Tab":
        close(false);
        return;
      default:
        break;
    }
  }

  const count = current.length;
  const triggerText = count === 0 ? placeholder : summary(count);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ position: "relative", display: "block", width: "100%", ...style }}
    >
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={aria["aria-label"]}
        aria-labelledby={aria["aria-labelledby"]}
        disabled={disabled}
        onKeyDown={onTriggerKeyDown}
        onClick={() => {
          if (open) close(true);
          else openList();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          width: "100%",
          padding: "9px 12px",
          background: C.bg,
          border: `1px solid ${open ? C.accent : C.border}`,
          color: count === 0 ? C.muted : C.fg,
          fontFamily: C.font,
          fontSize: 12.5,
          textAlign: "left",
          cursor: disabled === true ? "not-allowed" : "pointer",
          opacity: disabled === true ? 0.5 : 1,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {triggerText}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          aria-hidden="true"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 140ms ease",
            color: open ? C.accent : C.muted,
          }}
        >
          <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>

      {name !== undefined &&
        current.map((v) => <input key={v} type="hidden" name={name} value={v} />)}

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 60,
            background: C.panel,
            border: `1px solid ${C.border}`,
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          }}
        >
          <input
            ref={searchRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 && visible[activeIndex] !== undefined
                ? `${reactId}-opt-${String(activeIndex)}`
                : undefined
            }
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              setActiveIndex(firstEnabled(filterOptions(options, next)) ?? -1);
            }}
            onKeyDown={onSearchKeyDown}
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              padding: "9px 12px",
              background: C.bg,
              border: 0,
              borderBottom: `1px solid ${C.border}`,
              color: C.fg,
              fontFamily: C.font,
              fontSize: 12.5,
              outline: "none",
            }}
          />
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-multiselectable="true"
            aria-label={aria["aria-label"]}
            aria-labelledby={aria["aria-labelledby"]}
            style={{
              maxHeight: LIST_MAX_HEIGHT,
              overflowY: "auto",
              margin: 0,
              padding: 4,
              listStyle: "none",
            }}
          >
            {visible.map((option, index) => {
              const isChosen = chosen.has(option.value);
              const isActive = index === activeIndex;
              const isDisabled = option.disabled === true;
              return (
                <li
                  key={option.value}
                  id={`${reactId}-opt-${String(index)}`}
                  data-index={index}
                  role="option"
                  aria-selected={isChosen}
                  aria-disabled={isDisabled}
                  onMouseEnter={() => {
                    if (!isDisabled) setActiveIndex(index);
                  }}
                  // Keeps the focus in the search field, so the keys still work
                  // after a click.
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => {
                    toggle(option);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 10px",
                    fontFamily: C.font,
                    fontSize: 12.5,
                    color: isDisabled ? C.off : isChosen ? C.fg : C.option,
                    background: isActive && !isDisabled ? C.active : "transparent",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      width: 14,
                      height: 14,
                      border: `1px solid ${isChosen ? C.accent : C.border}`,
                      background: isChosen ? C.accent : "transparent",
                      color: C.panel,
                    }}
                  >
                    {isChosen && (
                      <svg width="9" height="9" viewBox="0 0 10 10">
                        <path
                          d="M1.5 5.2l2.3 2.3 4.7-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                      </svg>
                    )}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {option.label}
                  </span>
                  {option.hint !== undefined && (
                    <span style={{ flexShrink: 0, fontSize: 10.5, color: C.muted }}>
                      {option.hint}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {visible.length === 0 && (
            <p
              style={{
                margin: 0,
                padding: "10px 12px",
                fontFamily: C.font,
                fontSize: 11.5,
                color: C.muted,
              }}
            >
              {emptyText}
            </p>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "6px 8px 6px 12px",
              borderTop: `1px solid ${C.border}`,
              fontFamily: C.font,
              fontSize: 10.5,
              color: C.muted,
            }}
          >
            <span aria-live="polite">{count === 0 ? placeholder : summary(count)}</span>
            <button
              type="button"
              onClick={() => {
                close(true);
              }}
              style={{
                padding: "4px 10px",
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.fg,
                fontFamily: C.font,
                fontSize: 10.5,
                cursor: "pointer",
              }}
            >
              Terminé
            </button>
          </div>
        </div>
      )}

      {count > 0 && (
        <ul
          aria-label="Sélection"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            margin: "8px 0 0",
            padding: 0,
            listStyle: "none",
          }}
        >
          {current.map((v) => {
            const label = labelOf.get(v) ?? v;
            return (
              <li
                key={v}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  maxWidth: "100%",
                  padding: "3px 4px 3px 8px",
                  border: `1px solid ${C.border}`,
                  fontFamily: C.font,
                  fontSize: 11.5,
                  color: C.fg,
                }}
              >
                <span
                  style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {label}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Retirer ${label}`}
                  onClick={() => {
                    commit(current.filter((other) => other !== v));
                  }}
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 18,
                    height: 18,
                    padding: 0,
                    background: "transparent",
                    border: 0,
                    color: C.muted,
                    cursor: disabled === true ? "not-allowed" : "pointer",
                  }}
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

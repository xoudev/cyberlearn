"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  firstEnabled,
  lastEnabled,
  matchTypeahead,
  moveActive,
  TYPEAHEAD_RESET_MS,
} from "./select-nav.js";

/**
 * A dropdown that looks like the rest of the site.
 *
 * The reason this exists is narrow and worth stating: the closed state of a
 * <select> can be styled, and its open list cannot. The popup is drawn by the
 * operating system, so on every screen where one of these was used the site
 * handed the reader a white system menu in the middle of a dark interface. No
 * amount of CSS on the <select> changes that - the only way to style the list
 * is not to use one.
 *
 * So the list is a listbox, and everything the browser used to do for free is
 * done here: the roles, the arrow keys, Home and End, type-ahead, closing on
 * Escape or on a click elsewhere.
 *
 * The one thing that is NOT re-implemented is the form. A real <select> stays
 * in the DOM, carrying the name, the value and `required`; it is transparent
 * and takes no pointer events, so its own popup can never open, but the form
 * still submits it and the browser still refuses to submit a required one that
 * is empty, with its own message, anchored on the control that is visible.
 * Re-implementing validation was the alternative, and a field that is required
 * in the markup but only checked on the server is a field that silently is not.
 */

export interface SelectOption {
  value: string;
  label: string;
  /** Dimmed text after the label: a count, a code, a reminder. */
  hint?: string;
  /**
   * A CSS colour for this option, for lists where the value carries one - a
   * role, a status. It colours the option in the list and the control itself
   * once that option is the chosen one, so the field states the value the way
   * the tag beside it would.
   */
  tone?: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** Never mutated, so a frozen list of constants is welcome. */
  options: readonly SelectOption[];
  /** Controlled value. Leave out for a field the form reads on submit. */
  value?: string;
  /** Starting value when uncontrolled. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Submits under this name, exactly as the <select> it replaces did. */
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  /** What the closed control reads when the value matches no option. */
  placeholder?: string;
  /** Widens the control to its container. On by default. */
  block?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** On the wrapper, for how the field sits among its neighbours. */
  className?: string;
  /** On the wrapper too: width, margin, flex. */
  style?: React.CSSProperties;
  /** On the closed control, for its own metrics - height, font size. */
  triggerStyle?: React.CSSProperties;
}

/**
 * The palette, as custom properties so an app with its own can say so once.
 * The defaults are the web app's; the admin maps these to its --a-* scale.
 */
const C = {
  bg: "var(--cl-select-bg, #05041a)",
  fg: "var(--cl-select-fg, #f5f5fa)",
  muted: "var(--cl-select-fg-muted, #7f7ba9)",
  border: "var(--cl-select-border, #2a2560)",
  accent: "var(--cl-select-accent, var(--cosmetic-accent, #0affd4))",
  panel: "var(--cl-select-panel-bg, #0a0826)",
  option: "var(--cl-select-option-fg, #b8b5d1)",
  active: "var(--cl-select-option-active-bg, #141040)",
  off: "var(--cl-select-option-disabled-fg, #44406b)",
  font: "var(--font-mono, ui-monospace, monospace)",
} as const;

const PANEL_MAX_HEIGHT = 280;
/** Air between the control and its list, and between the list and the screen. */
const PANEL_GAP = 4;
const VIEWPORT_MARGIN = 12;

interface PanelBox {
  left: number;
  width: number;
  /** Set when the list hangs below the control. */
  top?: number;
  /** Set instead when there was more room above it. */
  bottom?: number;
  maxHeight: number;
}

function measure(trigger: HTMLElement): PanelBox {
  const rect = trigger.getBoundingClientRect();
  const below = window.innerHeight - rect.bottom - PANEL_GAP - VIEWPORT_MARGIN;
  const above = rect.top - PANEL_GAP - VIEWPORT_MARGIN;
  // Below unless it genuinely does not fit and there is more room the other
  // way: flipping a list that fits is more disorienting than a short list.
  const flip = below < Math.min(PANEL_MAX_HEIGHT, above) && above > below;
  return {
    left: rect.left,
    width: rect.width,
    ...(flip
      ? { bottom: window.innerHeight - rect.top + PANEL_GAP }
      : { top: rect.bottom + PANEL_GAP }),
    maxHeight: Math.max(120, Math.min(PANEL_MAX_HEIGHT, flip ? above : below)),
  };
}

export function Select({
  options,
  value,
  defaultValue,
  onChange,
  name,
  id,
  required,
  disabled,
  placeholder = "Choisir…",
  block = true,
  className,
  style,
  triggerStyle,
  ...aria
}: SelectProps): React.JSX.Element {
  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const controlled = value !== undefined;
  const [ownValue, setOwnValue] = useState(defaultValue ?? "");
  const current = controlled ? value : ownValue;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [box, setBox] = useState<PanelBox | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const nativeRef = useRef<HTMLSelectElement | null>(null);
  const typed = useRef<{ text: string; at: number }>({ text: "", at: 0 });

  const selectedIndex = options.findIndex((o) => o.value === current);
  const selected = selectedIndex === -1 ? null : options[selectedIndex];

  // The native control is uncontrolled so React never fights the DOM over it;
  // it is pushed the current value instead, which is what the form reads.
  useEffect(() => {
    if (nativeRef.current) nativeRef.current.value = current;
  }, [current]);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setActiveIndex(-1);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const commit = useCallback(
    (next: string) => {
      if (!controlled) setOwnValue(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );

  const choose = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option || option.disabled === true) return;
      commit(option.value);
      close(true);
    },
    [options, commit, close],
  );

  /**
   * Opens the list with something already highlighted.
   *
   * `from` says which end to come in from when nothing is chosen yet: Down
   * lands on the first option and Up on the last, the way a native select
   * does. Once a value exists it wins over both - reopening a list should show
   * where you are, not where the key came from.
   */
  const openList = useCallback(
    (from: "start" | "end") => {
      if (disabled === true) return;
      const trigger = triggerRef.current;
      if (!trigger) return;
      setBox(measure(trigger));
      setActiveIndex(
        selectedIndex >= 0
          ? selectedIndex
          : ((from === "start" ? firstEnabled(options) : lastEnabled(options)) ?? -1),
      );
      setOpen(true);
    },
    [disabled, selectedIndex, options],
  );

  // Anything that moves the control out from under its list closes it. Tracking
  // a scroll would mean following every scrollable ancestor; closing is both
  // simpler and what a native popup does.
  useEffect(() => {
    if (!open) return;
    const shut = (): void => {
      close(false);
    };
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) === true) return;
      if (listRef.current?.contains(target) === true) return;
      close(false);
    };
    window.addEventListener("scroll", shut, true);
    window.addEventListener("resize", shut);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("scroll", shut, true);
      window.removeEventListener("resize", shut);
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

  function onKeyDown(event: React.KeyboardEvent): void {
    if (disabled === true) return;

    if (!open) {
      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        openList(event.key === "ArrowUp" ? "end" : "start");
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => moveActive(options, i, 1) ?? i);
        return;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => moveActive(options, i, -1) ?? i);
        return;
      case "Home":
        event.preventDefault();
        setActiveIndex((i) => firstEnabled(options) ?? i);
        return;
      case "End":
        event.preventDefault();
        setActiveIndex((i) => lastEnabled(options) ?? i);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        if (activeIndex >= 0) choose(activeIndex);
        return;
      case "Escape":
        event.preventDefault();
        close(true);
        return;
      case "Tab":
        close(false);
        return;
      default:
        break;
    }

    // Type-ahead. One printable character at a time, strung together while the
    // person keeps typing.
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      const text =
        now - typed.current.at > TYPEAHEAD_RESET_MS ? event.key : typed.current.text + event.key;
      typed.current = { text, at: now };
      // Repeating one letter walks through the options starting with it; a
      // longer word restarts the search from the current place.
      const from = text.length === 1 ? activeIndex : activeIndex - 1;
      const hit = matchTypeahead(options, text, from);
      if (hit !== null) {
        event.preventDefault();
        setActiveIndex(hit);
      }
    }
  }

  const label = selected?.label ?? placeholder;

  return (
    <span
      className={className}
      style={{
        position: "relative",
        display: block ? "block" : "inline-block",
        width: block ? "100%" : undefined,
        ...style,
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={
          open && activeIndex >= 0 ? `${reactId}-opt-${String(activeIndex)}` : undefined
        }
        aria-required={required}
        aria-label={aria["aria-label"]}
        aria-labelledby={aria["aria-labelledby"]}
        disabled={disabled}
        onKeyDown={onKeyDown}
        onClick={() => {
          if (open) close(true);
          else openList("start");
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          width: "100%",
          padding: "9px 12px",
          background: C.bg,
          border: `1px solid ${open ? (selected?.tone ?? C.accent) : selected?.tone === undefined ? C.border : `color-mix(in srgb, ${selected.tone} 40%, transparent)`}`,
          borderRadius: 0,
          color: selected ? (selected.tone ?? C.fg) : C.muted,
          fontFamily: C.font,
          fontSize: 12.5,
          textAlign: "left",
          cursor: disabled === true ? "not-allowed" : "pointer",
          opacity: disabled === true ? 0.5 : 1,
          ...triggerStyle,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
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

      {/* The form's actual field. Transparent, inert, and exactly over the
          control, so a required-and-empty message points at what is visible.
          It comes after the button on purpose: a <label> wrapping this whole
          control labels its first labelable descendant, and that has to be
          the thing a person can see and focus. */}
      <select
        ref={nativeRef}
        name={name}
        required={required}
        disabled={disabled}
        defaultValue={current}
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        {/* An empty option so a placeholder value is representable; without it
            the browser would snap the field to the first real option. */}
        <option value="" />
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {open && box !== null
        ? createPortal(
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={aria["aria-label"]}
              aria-labelledby={aria["aria-labelledby"]}
              style={{
                position: "fixed",
                left: box.left,
                width: box.width,
                ...(box.top !== undefined ? { top: box.top } : { bottom: box.bottom }),
                maxHeight: box.maxHeight,
                overflowY: "auto",
                margin: 0,
                padding: 4,
                listStyle: "none",
                background: C.panel,
                border: `1px solid ${C.border}`,
                boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                zIndex: 9999,
              }}
            >
              {options.map((option, index) => {
                const isSelected = option.value === current;
                const isActive = index === activeIndex;
                const isDisabled = option.disabled === true;
                return (
                  <li
                    key={option.value}
                    id={`${reactId}-opt-${String(index)}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={isDisabled}
                    onMouseEnter={() => {
                      if (!isDisabled) setActiveIndex(index);
                    }}
                    onClick={() => {
                      choose(index);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "7px 10px",
                      fontFamily: C.font,
                      fontSize: 12.5,
                      color: isDisabled
                        ? C.off
                        : (option.tone ?? (isSelected ? C.accent : C.option)),
                      background: isActive && !isDisabled ? C.active : "transparent",
                      borderLeft: `2px solid ${isSelected ? (option.tone ?? C.accent) : "transparent"}`,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                    }}
                  >
                    <span
                      style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
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
            </ul>,
            document.body,
          )
        : null}
    </span>
  );
}

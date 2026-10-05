"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import type { RowColumn, SelectOption } from "@cyberlearn/lib/mdx-forms";

/**
 * The widgets a block's form is made of: one per field kind of
 * @cyberlearn/lib/mdx-forms, drawn in the editor's chrome (the dark panel,
 * the mono labels). Each one takes a value and hands back the next; none
 * keeps state of its own, so a block's fields and its MDX never disagree.
 */

/** `record` without `key`: a new object, the rest as it was. */
export function omit<T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
}

export const BORDER = "var(--color-border-default)";
export const MONO = "var(--font-mono)";
export const DANGER = "var(--color-danger)";
export const MUTED = "var(--color-text-muted)";
export const TEXT = "var(--color-text-primary)";
const INPUT_BG = "#07051E";

const inputStyle = (invalid: boolean, mono: boolean): React.CSSProperties => ({
  width: "100%",
  boxSizing: "border-box",
  background: INPUT_BG,
  border: `1px solid ${invalid ? DANGER : BORDER}`,
  borderRadius: 2,
  color: TEXT,
  fontFamily: mono ? MONO : "inherit",
  fontSize: mono ? 12 : 13,
  lineHeight: 1.5,
  padding: "5px 8px",
  outline: "none",
});

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  htmlFor?: string | undefined;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label
        htmlFor={htmlFor}
        style={{
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: error === undefined ? MUTED : DANGER,
        }}
      >
        {label}
      </label>
      {children}
      {error !== undefined ? (
        <span role="alert" style={{ fontFamily: MONO, fontSize: 10, color: DANGER }}>
          {error}
        </span>
      ) : (
        hint !== undefined && (
          <span style={{ fontFamily: MONO, fontSize: 9.5, color: "#5A5785" }}>{hint}</span>
        )
      )}
    </div>
  );
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  mono = false,
  invalid = false,
  ariaLabel,
}: {
  id?: string | undefined;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  mono?: boolean;
  invalid?: boolean;
  ariaLabel?: string | undefined;
}): React.ReactElement {
  return (
    <input
      id={id}
      type="text"
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      style={inputStyle(invalid, mono)}
    />
  );
}

export function TextArea({
  id,
  value,
  onChange,
  mono = false,
  rows = 3,
  invalid = false,
  placeholder,
  ariaLabel,
}: {
  id?: string | undefined;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
  rows?: number;
  invalid?: boolean;
  placeholder?: string | undefined;
  ariaLabel?: string | undefined;
}): React.ReactElement {
  // Grows with its text, to a point: a long code block scrolls inside.
  const lines = value.split("\n").length;
  return (
    <textarea
      id={id}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      rows={Math.min(Math.max(rows, lines + 1), 24)}
      spellCheck={!mono}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      style={{ ...inputStyle(invalid, mono), resize: "vertical", whiteSpace: "pre" }}
    />
  );
}

export function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  invalid = false,
}: {
  id?: string | undefined;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number | undefined;
  max?: number | undefined;
  invalid?: boolean;
}): React.ReactElement {
  return (
    <input
      id={id}
      type="number"
      value={value === undefined ? "" : String(value)}
      min={min}
      max={max}
      onChange={(e) => {
        onChange(e.target.value === "" ? undefined : Number(e.target.value));
      }}
      style={{ ...inputStyle(invalid, true), width: 140 }}
    />
  );
}

export function Checkbox({
  id,
  checked,
  onChange,
  label,
}: {
  id?: string | undefined;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}): React.ReactElement {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: TEXT }}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
      />
      {label}
    </label>
  );
}

export function SelectInput({
  id,
  value,
  options,
  onChange,
  invalid = false,
  ariaLabel,
}: {
  id?: string | undefined;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  invalid?: boolean;
  ariaLabel?: string | undefined;
}): React.ReactElement {
  return (
    <select
      id={id}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      style={{ ...inputStyle(invalid, true), width: "auto", minWidth: 160, cursor: "pointer" }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} style={{ background: INPUT_BG }}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** The small buttons of a list: add a line, remove one, move a block. */
export function SmallButton({
  children,
  onClick,
  title,
  tone = "plain",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  tone?: "plain" | "danger" | "accent";
  disabled?: boolean;
}): React.ReactElement {
  const color = tone === "danger" ? DANGER : tone === "accent" ? "var(--cosmetic-accent)" : MUTED;
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 22,
        padding: "0 7px",
        border: `1px solid ${disabled ? "var(--color-border-subtle)" : BORDER}`,
        background: "transparent",
        color: disabled ? "var(--color-text-disabled)" : color,
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        cursor: disabled ? "default" : "pointer",
        borderRadius: 2,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

export function ListInput({
  items,
  onChange,
  placeholder,
  invalid = false,
  label,
}: {
  items: readonly string[];
  onChange: (items: string[]) => void;
  placeholder?: string | undefined;
  invalid?: boolean;
  /** Names the lines for assistive technology: "Indice 2". */
  label: string;
}): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((item, i) => (
        // SAFETY: lines have no identity of their own; position is the key.
        <div key={i} style={{ display: "flex", gap: 6 }}>
          <TextInput
            value={item}
            placeholder={placeholder}
            invalid={invalid && item.trim() === ""}
            ariaLabel={`${label} ${String(i + 1)}`}
            onChange={(value) => {
              onChange(items.map((it, k) => (k === i ? value : it)));
            }}
          />
          <SmallButton
            title={`Retirer ${label.toLowerCase()} ${String(i + 1)}`}
            tone="danger"
            onClick={() => {
              onChange(items.filter((_, k) => k !== i));
            }}
          >
            ✕
          </SmallButton>
        </div>
      ))}
      <div>
        <SmallButton
          title={`Ajouter : ${label.toLowerCase()}`}
          tone="accent"
          onClick={() => {
            onChange([...items, ""]);
          }}
        >
          + Ajouter
        </SmallButton>
      </div>
    </div>
  );
}

export function MapInput({
  entries,
  onChange,
  keyLabel,
  valueLabel,
  multiline = false,
  invalid = false,
}: {
  entries: Readonly<Record<string, string>>;
  onChange: (entries: Record<string, string>) => void;
  keyLabel: string;
  valueLabel: string;
  multiline?: boolean;
  invalid?: boolean;
}): React.ReactElement {
  const pairs = Object.entries(entries);
  const emit = (next: [string, string][]): void => {
    onChange(Object.fromEntries(next));
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {pairs.map(([key, value], i) => (
        // SAFETY: a pair's key can be edited, so its position is the stable key.
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 6 }}>
          <TextInput
            value={key}
            placeholder={keyLabel}
            mono
            invalid={invalid && key.trim() === ""}
            ariaLabel={`${keyLabel} ${String(i + 1)}`}
            onChange={(next) => {
              emit(pairs.map((pair, k) => (k === i ? [next, pair[1]] : pair)));
            }}
          />
          {multiline ? (
            <TextArea
              value={value}
              mono
              rows={1}
              ariaLabel={`${valueLabel} ${String(i + 1)}`}
              onChange={(next) => {
                emit(pairs.map((pair, k) => (k === i ? [pair[0], next] : pair)));
              }}
            />
          ) : (
            <TextInput
              value={value}
              placeholder={valueLabel}
              ariaLabel={`${valueLabel} ${String(i + 1)}`}
              onChange={(next) => {
                emit(pairs.map((pair, k) => (k === i ? [pair[0], next] : pair)));
              }}
            />
          )}
          <SmallButton
            title={`Retirer ${keyLabel.toLowerCase()} ${String(i + 1)}`}
            tone="danger"
            onClick={() => {
              emit(pairs.filter((_, k) => k !== i));
            }}
          >
            ✕
          </SmallButton>
        </div>
      ))}
      <div>
        <SmallButton
          title={`Ajouter : ${keyLabel.toLowerCase()}`}
          tone="accent"
          onClick={() => {
            emit([...pairs, ["", ""]]);
          }}
        >
          + Ajouter
        </SmallButton>
      </div>
    </div>
  );
}

export function ChoicesInput({
  options,
  correct,
  onChange,
  invalid = false,
}: {
  options: readonly string[];
  correct: number | undefined;
  onChange: (options: string[], correct: number | undefined) => void;
  invalid?: boolean;
}): React.ReactElement {
  const group = useId();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {options.map((option, i) => (
        // SAFETY: options have no identity of their own; position is the key.
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="radio"
            name={group}
            checked={correct === i}
            aria-label={`Bonne réponse : option ${String(i + 1)}`}
            onChange={() => {
              onChange([...options], i);
            }}
          />
          <TextInput
            value={option}
            placeholder={`Option ${String(i + 1)}`}
            invalid={invalid && option.trim() === ""}
            ariaLabel={`Option ${String(i + 1)}`}
            onChange={(value) => {
              onChange(
                options.map((it, k) => (k === i ? value : it)),
                correct,
              );
            }}
          />
          <SmallButton
            title={`Retirer l'option ${String(i + 1)}`}
            tone="danger"
            onClick={() => {
              const next = options.filter((_, k) => k !== i);
              const nextCorrect =
                correct === undefined || correct === i
                  ? undefined
                  : correct > i
                    ? correct - 1
                    : correct;
              onChange(next, nextCorrect);
            }}
          >
            ✕
          </SmallButton>
        </div>
      ))}
      <div>
        <SmallButton
          title="Ajouter une option"
          tone="accent"
          onClick={() => {
            onChange([...options, ""], correct);
          }}
        >
          + Option
        </SmallButton>
      </div>
    </div>
  );
}

export function RowsInput({
  rows,
  columns,
  onChange,
  label,
}: {
  rows: readonly Readonly<Record<string, unknown>>[];
  columns: readonly RowColumn[];
  onChange: (rows: Record<string, unknown>[]) => void;
  /** Names a row for assistive technology: "Cas de test 2". */
  label: string;
}): React.ReactElement {
  const update = (i: number, key: string, value: unknown): void => {
    onChange(
      rows.map((row, k) => {
        if (k !== i) return { ...row };
        return value === undefined || value === "" ? omit(row, key) : { ...row, [key]: value };
      }),
    );
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((row, i) => (
        // SAFETY: rows have no identity of their own; position is the key.
        <div
          key={i}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            padding: "8px 8px 8px 10px",
            border: `1px solid var(--color-border-subtle)`,
            borderLeft: `2px solid ${BORDER}`,
          }}
        >
          {columns.map((column) => {
            const value = row[column.key];
            const name = `${label} ${String(i + 1)} : ${column.label}`;
            return (
              <div
                key={column.key}
                style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 120, flex: 1 }}
              >
                <span
                  style={{ fontFamily: MONO, fontSize: 8.5, color: MUTED, letterSpacing: "0.1em" }}
                >
                  {column.label.toUpperCase()}
                  {column.required === true ? " *" : ""}
                </span>
                {column.kind === "select" ? (
                  <SelectInput
                    value={typeof value === "string" ? value : ""}
                    options={[{ value: "", label: "…" }, ...(column.options ?? [])]}
                    ariaLabel={name}
                    onChange={(next) => {
                      update(i, column.key, next);
                    }}
                  />
                ) : column.kind === "number" ? (
                  <NumberInput
                    value={typeof value === "number" ? value : undefined}
                    onChange={(next) => {
                      update(i, column.key, next);
                    }}
                  />
                ) : column.kind === "texts" ? (
                  <TextInput
                    value={
                      Array.isArray(value)
                        ? value.join(" | ")
                        : typeof value === "string"
                          ? value
                          : ""
                    }
                    placeholder={column.placeholder ?? "une réponse | une autre"}
                    ariaLabel={name}
                    onChange={(next) => {
                      const parts = next.split("|").map((part) => part.trim());
                      update(i, column.key, parts.length > 1 ? parts : next);
                    }}
                  />
                ) : column.kind === "boolean" ? (
                  <Checkbox
                    checked={value === true}
                    label={value === true ? "Oui" : "Non"}
                    onChange={(checked) => {
                      update(i, column.key, checked ? true : undefined);
                    }}
                  />
                ) : (
                  <TextInput
                    value={typeof value === "string" ? value : ""}
                    placeholder={column.placeholder}
                    mono
                    ariaLabel={name}
                    onChange={(next) => {
                      update(i, column.key, next);
                    }}
                  />
                )}
              </div>
            );
          })}
          <div style={{ alignSelf: "flex-end" }}>
            <SmallButton
              title={`Retirer ${label.toLowerCase()} ${String(i + 1)}`}
              tone="danger"
              onClick={() => {
                onChange(rows.filter((_, k) => k !== i).map((r) => ({ ...r })));
              }}
            >
              ✕
            </SmallButton>
          </div>
        </div>
      ))}
      <div>
        <SmallButton
          title={`Ajouter : ${label.toLowerCase()}`}
          tone="accent"
          onClick={() => {
            onChange([...rows.map((r) => ({ ...r })), {}]);
          }}
        >
          + Ajouter
        </SmallButton>
      </div>
    </div>
  );
}

/** Several of the options, kept in the options' order. */
export function MultiSelectInput({
  value,
  options,
  onChange,
  label,
}: {
  value: readonly string[];
  options: readonly SelectOption[];
  onChange: (value: string[]) => void;
  label: string;
}): React.ReactElement {
  return (
    <div
      role="group"
      aria-label={label}
      style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}
    >
      {options.map((option) => (
        <label
          key={option.value}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: TEXT }}
        >
          <input
            type="checkbox"
            checked={value.includes(option.value)}
            onChange={(e) => {
              const next = options
                .map((o) => o.value)
                .filter((v) => (v === option.value ? e.target.checked : value.includes(v)));
              onChange(next);
            }}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

/**
 * A structure edited as JSON. The text is the widget's own while it is being
 * typed, since half a structure is not JSON: the value goes out once the
 * text parses, and the field says so meanwhile. A value changed from outside
 * (another view, a parse) replaces the text.
 */
export function JsonInput({
  id,
  value,
  onChange,
  rows = 4,
  placeholder,
  invalid = false,
}: {
  id?: string | undefined;
  value: unknown;
  onChange: (value: unknown) => void;
  rows?: number;
  placeholder?: string | undefined;
  invalid?: boolean;
}): React.ReactElement {
  const print = (v: unknown): string => (v === undefined ? "" : JSON.stringify(v, null, 2));
  const [text, setText] = useState(() => print(value));
  const [broken, setBroken] = useState(false);
  const emitted = useRef(print(value));

  useEffect(() => {
    const printed = print(value);
    if (printed !== emitted.current) {
      emitted.current = printed;
      setText(printed);
      setBroken(false);
    }
  }, [value]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <TextArea
        id={id}
        value={text}
        mono
        rows={rows}
        placeholder={placeholder}
        invalid={invalid || broken}
        onChange={(next) => {
          setText(next);
          if (next.trim() === "") {
            setBroken(false);
            emitted.current = "";
            onChange(undefined);
            return;
          }
          try {
            const parsed: unknown = JSON.parse(next);
            setBroken(false);
            emitted.current = print(parsed);
            onChange(parsed);
          } catch {
            setBroken(true);
          }
        }}
      />
      {broken && (
        <span role="alert" style={{ fontFamily: MONO, fontSize: 10, color: DANGER }}>
          JSON incomplet ou mal formé : la valeur précédente est gardée en attendant.
        </span>
      )}
    </div>
  );
}

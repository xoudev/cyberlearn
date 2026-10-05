"use client";

import React, { useId } from "react";
import type { ComponentBlock } from "@cyberlearn/lib/mdx-blocks";
import {
  INNER,
  type ComponentForm,
  type FieldSpec,
  type FormErrors,
} from "@cyberlearn/lib/mdx-forms";
import {
  Checkbox,
  ChoicesInput,
  Field,
  ListInput,
  MapInput,
  NumberInput,
  omit,
  RowsInput,
  SelectInput,
  TextArea,
  TextInput,
} from "./fields";

/**
 * A component block as a form: the fields its declaration lists
 * (@cyberlearn/lib/mdx-forms), each bound to one attribute or to the
 * children. Every change hands the whole set back, and the block is written
 * anew from it (model.ts). The "blocks" kind, a group's questions, is
 * drawn by the block list itself, handed in as `nested` so this file does
 * not have to know what a list of blocks looks like.
 */

export interface ComponentFormProps {
  block: ComponentBlock;
  form: ComponentForm;
  errors: FormErrors;
  onChange: (attrs: Record<string, unknown>, inner: string | null) => void;
  /** Draws the children as blocks of the allowed names. */
  nested: (
    inner: string | null,
    allowed: readonly string[],
    onInnerChange: (inner: string | null) => void,
  ) => React.ReactNode;
}

export function ComponentFormView({
  block,
  form,
  errors,
  onChange,
  nested,
}: ComponentFormProps): React.ReactElement {
  const prefix = useId();
  const attrs = block.attrs;
  const setAttr = (key: string, value: unknown): void => {
    onChange(value === undefined ? omit(attrs, key) : { ...attrs, [key]: value }, block.inner);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {form.fields.map((field) => (
        <FieldView
          key={field.key}
          id={`${prefix}-${field.key}`}
          field={field}
          attrs={attrs}
          inner={block.inner}
          error={errors[field.key]}
          setAttr={setAttr}
          setAttrs={(next) => {
            onChange(next, block.inner);
          }}
          setInner={(inner) => {
            onChange(attrs, inner);
          }}
          nested={nested}
        />
      ))}
    </div>
  );
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => (typeof item === "string" ? item : "")) : [];
}

function asRecord(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, asString(v)]),
  );
}

function asRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map((row) =>
        typeof row === "object" && row !== null ? { ...(row as Record<string, unknown>) } : {},
      )
    : [];
}

function FieldView({
  id,
  field,
  attrs,
  inner,
  error,
  setAttr,
  setAttrs,
  setInner,
  nested,
}: {
  id: string;
  field: FieldSpec;
  attrs: Readonly<Record<string, unknown>>;
  inner: string | null;
  error: string | undefined;
  setAttr: (key: string, value: unknown) => void;
  /** Replaces the whole set at once, for a field that owns two attributes. */
  setAttrs: (attrs: Record<string, unknown>) => void;
  setInner: (inner: string | null) => void;
  nested: ComponentFormProps["nested"];
}): React.ReactElement {
  const label = field.required === true ? `${field.label} *` : field.label;
  const value = attrs[field.key];
  const invalid = error !== undefined;

  switch (field.kind) {
    case "text":
      return (
        <Field label={label} hint={field.hint} error={error} htmlFor={id}>
          <TextInput
            id={id}
            value={asString(value)}
            placeholder={field.placeholder}
            mono={field.key === "id" || field.key === "src" || field.key === "href"}
            invalid={invalid}
            onChange={(next) => {
              setAttr(field.key, next === "" ? undefined : next);
            }}
          />
        </Field>
      );
    case "textarea":
      return (
        <Field label={label} hint={field.hint} error={error} htmlFor={id}>
          <TextArea
            id={id}
            value={asString(value)}
            mono={field.mono === true}
            rows={field.rows ?? 3}
            invalid={invalid}
            onChange={(next) => {
              setAttr(field.key, next === "" ? undefined : next);
            }}
          />
        </Field>
      );
    case "number":
      return (
        <Field label={label} hint={field.hint} error={error} htmlFor={id}>
          <NumberInput
            id={id}
            value={typeof value === "number" ? value : undefined}
            min={field.min}
            max={field.max}
            invalid={invalid}
            onChange={(next) => {
              setAttr(field.key, next);
            }}
          />
        </Field>
      );
    case "boolean":
      return (
        <Field label={label} hint={field.hint} error={error}>
          <Checkbox
            id={id}
            checked={value === true}
            label={value === true ? "Oui" : "Non"}
            onChange={(checked) => {
              setAttr(field.key, checked ? true : undefined);
            }}
          />
        </Field>
      );
    case "select":
      return (
        <Field label={label} hint={field.hint} error={error} htmlFor={id}>
          <SelectInput
            id={id}
            value={asString(value)}
            options={field.options}
            invalid={invalid}
            onChange={(next) => {
              setAttr(field.key, next === "" ? undefined : next);
            }}
          />
        </Field>
      );
    case "list":
      return (
        <Field label={label} hint={field.hint} error={error}>
          <ListInput
            items={asStrings(value)}
            placeholder={field.placeholder}
            invalid={invalid}
            label={field.label}
            onChange={(items) => {
              setAttr(field.key, items.length === 0 ? undefined : items);
            }}
          />
        </Field>
      );
    case "map":
      return (
        <Field label={label} hint={field.hint} error={error}>
          <MapInput
            entries={asRecord(value)}
            keyLabel={field.keyLabel}
            valueLabel={field.valueLabel}
            multiline={field.multiline === true}
            invalid={invalid}
            onChange={(entries) => {
              setAttr(field.key, Object.keys(entries).length === 0 ? undefined : entries);
            }}
          />
        </Field>
      );
    case "choices": {
      const correct = attrs[field.correctKey];
      return (
        <Field label={label} hint={field.hint} error={error}>
          <ChoicesInput
            options={asStrings(value)}
            correct={typeof correct === "number" ? correct : undefined}
            invalid={invalid}
            onChange={(options, nextCorrect) => {
              // One change for both attributes, so they never disagree.
              const withOptions = { ...attrs, [field.key]: options };
              setAttrs(
                nextCorrect === undefined
                  ? omit(withOptions, field.correctKey)
                  : { ...withOptions, [field.correctKey]: nextCorrect },
              );
            }}
          />
        </Field>
      );
    }
    case "rows":
      return (
        <Field label={label} hint={field.hint} error={error}>
          <RowsInput
            rows={asRows(value)}
            columns={field.columns}
            label={field.label}
            onChange={(rows) => {
              setAttr(field.key, rows.length === 0 ? undefined : rows);
            }}
          />
        </Field>
      );
    case "children":
      return (
        <Field label={label} hint={field.hint} error={error} htmlFor={id}>
          <TextArea
            id={id}
            value={inner ?? ""}
            mono={field.mono === true}
            rows={field.mono === true ? 6 : 3}
            invalid={invalid}
            onChange={(next) => {
              setInner(next === "" ? null : next);
            }}
          />
        </Field>
      );
    case "blocks":
      return (
        <Field label={label} hint={field.hint} error={error}>
          {nested(inner, field.allowed, setInner)}
        </Field>
      );
  }
}

export { INNER };

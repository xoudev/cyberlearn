"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createOtpAutoSubmit, sanitizeOtpCode } from "@cyberlearn/lib/auth/otp-code";

/**
 * The field a TOTP code is typed into, on the site and on the console.
 *
 * Four screens drew their own, and they had drifted: the console's challenge
 * had no label, its enrolment no focus, and every one of them capped the field
 * with `maxLength`, which cuts a pasted "123 456" to "123 45" before the
 * digit filter ever runs. The skin stays with each app (class names or
 * styles); what a code field is, is decided here.
 */
export interface OtpCodeInputProps {
  /** Visible label. The field is never left with a placeholder for a name. */
  label: string;
  value: string;
  /** Receives the digits only, six at most. */
  onValueChange: (code: string) => void;
  /** On by default: the code is the only thing these screens ask for. */
  autoFocus?: boolean | undefined;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
  name?: string | undefined;
  /** On the wrapping <label>. */
  className?: string | undefined;
  style?: CSSProperties | undefined;
  /** On the label's text. */
  labelClassName?: string | undefined;
  labelStyle?: CSSProperties | undefined;
  inputClassName?: string | undefined;
  inputStyle?: CSSProperties | undefined;
}

export function OtpCodeInput({
  label,
  value,
  onValueChange,
  autoFocus = true,
  disabled,
  placeholder,
  name,
  className,
  style,
  labelClassName,
  labelStyle,
  inputClassName,
  inputStyle,
}: OtpCodeInputProps): React.JSX.Element {
  return (
    <label className={className} style={style}>
      <span className={labelClassName} style={labelStyle}>
        {label}
      </span>
      <input
        className={inputClassName}
        style={inputStyle}
        value={value}
        onChange={(event) => {
          onValueChange(sanitizeOtpCode(event.target.value));
        }}
        name={name}
        // No maxLength: sanitizeOtpCode caps the value, after the separators
        // of a pasted code are gone.
        inputMode="numeric"
        autoComplete="one-time-code"
        enterKeyHint="done"
        spellCheck={false}
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
      />
    </label>
  );
}

/**
 * Sends the code on its sixth digit, once.
 *
 * A TOTP code is always six digits, so asking for a click afterwards is a step
 * that carries no decision. It matters most where autocomplete fills the whole
 * field at once from a password manager, and the button that was the only way
 * in is suddenly the only thing left to do.
 *
 * Returns the hand-made send, for the form's submit (a button, Enter): it
 * records the code first, so that insisting on a refused code is not followed
 * by a second, automatic send of it.
 */
export function useOtpAutoSubmit({
  code,
  pending,
  onSubmit,
}: {
  code: string;
  /** True while a verification is in flight; the code waits for it to end. */
  pending: boolean;
  onSubmit: (code: string) => void;
}): (code: string) => void {
  const [gate] = useState(createOtpAutoSubmit);
  // The latest callback, so a parent that recreates it on every render does
  // not re-run the effect below - which would be harmless, but noisy.
  const latest = useRef(onSubmit);
  useEffect(() => {
    latest.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    if (gate.shouldSubmit(code, pending)) latest.current(code);
  }, [code, pending, gate]);

  return useCallback(
    (value: string) => {
      gate.markSubmitted(value);
      latest.current(value);
    },
    [gate],
  );
}

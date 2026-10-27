"use client";

// Controlled switches and the save bar reflect the forms' draft and action state.
import type React from "react";

export function Switch({
  on,
  onClick,
  disabled = false,
  label,
}: {
  on: boolean;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      className="settings-switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="settings-switch__track" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}
export function ToggleRow({
  name,
  desc,
  info,
  children,
  last = false,
}: {
  name: string;
  desc: string;
  info?: React.ReactNode;
  children: React.ReactNode;
  last?: boolean;
}): React.JSX.Element {
  return (
    <div className="settings-toggle" data-last={last}>
      <div className="settings-toggle__copy">
        <div className="settings-toggle__name">
          {name}
          {info}
        </div>
        <p>{desc}</p>
      </div>
      {children}
    </div>
  );
}
export function SaveBar({
  dirty,
  pending,
  onCancel,
}: {
  dirty: boolean;
  pending: boolean;
  onCancel: () => void;
}): React.JSX.Element {
  const idle = !dirty || pending;
  return (
    <div className="settings-save-bar" data-dirty={dirty}>
      <p role="status">{dirty ? "Modifications en attente" : "Synchronisé"}</p>
      <div>
        <button
          type="button"
          className="settings-button settings-button--secondary"
          disabled={idle}
          onClick={onCancel}
        >
          Annuler
        </button>
        <button type="submit" className="settings-button" disabled={idle}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

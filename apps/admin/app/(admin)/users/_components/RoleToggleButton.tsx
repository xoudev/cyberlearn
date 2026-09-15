"use client";

import React, { useTransition } from "react";
import { updateUserRoleAction } from "../../_actions/user-actions";

const DANGER = "#FF4D6D";
const TEACHER = "#6E8BFF";

/**
 * Three roles no longer fit a toggle.
 *
 * This was a button that flipped between STUDENT and ADMIN, which is exactly
 * as expressive as the two-value enum behind it. With TEACHER added there is
 * no "the other one" to flip to, and a toggle would leave the new role
 * unreachable - the migration would ship a role nothing could ever assign.
 *
 * A select also states the whole ladder at a glance, which a button reading
 * "↑ Admin" never did.
 */
const ROLES = [
  { value: "STUDENT" as const, label: "Étudiant", color: "#6B6890" },
  { value: "TEACHER" as const, label: "Professeur", color: TEACHER },
  { value: "ADMIN" as const, label: "Admin", color: DANGER },
];

interface RoleToggleButtonProps {
  userId: string;
  currentRole: string;
}

export function RoleToggleButton({
  userId,
  currentRole,
}: RoleToggleButtonProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const current = ROLES.find((r) => r.value === currentRole) ?? ROLES[0];

  return (
    <select
      value={currentRole}
      disabled={isPending}
      aria-label="Rôle de l'utilisateur"
      onChange={(e) => {
        const next = e.target.value;
        // Guard rather than cast: the option list is ours, but the value comes
        // back off the DOM as a plain string.
        const role = ROLES.find((r) => r.value === next);
        if (!role || role.value === currentRole) return;
        startTransition(async () => {
          await updateUserRoleAction(userId, role.value);
        });
      }}
      style={{
        padding: "5px 10px",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 9,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        background: "transparent",
        border: `1px solid ${current?.color === "#6B6890" ? "#2A2560" : (current?.color ?? "#2A2560")}`,
        color: current?.color ?? "#6B6890",
        cursor: isPending ? "not-allowed" : "pointer",
        opacity: isPending ? 0.5 : 1,
        transition: "all 150ms ease",
        whiteSpace: "nowrap",
      }}
    >
      {ROLES.map((r) => (
        <option key={r.value} value={r.value} style={{ background: "#0A0826", color: "#F5F5FA" }}>
          {r.label}
        </option>
      ))}
    </select>
  );
}

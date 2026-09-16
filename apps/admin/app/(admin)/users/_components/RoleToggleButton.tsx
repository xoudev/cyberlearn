"use client";

import React, { useTransition } from "react";
import type { UserRole } from "@cyberlearn/db";
import { ROLE_LABEL, ROLE_TONE, isUserRole } from "@/lib/roles";
import { UI, toneColor } from "../../_components/admin-ui";
import { updateUserRoleAction } from "../../_actions/user-actions";

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

// Least privileged first: a select reads as a ladder, and the ladder should
// climb.
const ROLE_ORDER: readonly UserRole[] = ["STUDENT", "TEACHER", "ADMIN"];

// The colour comes from the same tone the role wears everywhere else. This
// control used to hold its own three hex values, so an admin was red here and
// turquoise in the list beside it - one role, two colours, and nothing saying
// which was right.
function colorFor(role: string): string {
  return isUserRole(role) ? toneColor(ROLE_TONE[role]) : UI.muted;
}

interface RoleToggleButtonProps {
  userId: string;
  currentRole: string;
}

export function RoleToggleButton({
  userId,
  currentRole,
}: RoleToggleButtonProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const currentColor = colorFor(currentRole);

  return (
    <select
      value={currentRole}
      disabled={isPending}
      aria-label="Rôle de l'utilisateur"
      onChange={(e) => {
        const next = e.target.value;
        // Guard rather than cast: the option list is ours, but the value comes
        // back off the DOM as a plain string.
        if (!isUserRole(next) || next === currentRole) return;
        startTransition(async () => {
          await updateUserRoleAction(userId, next);
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
        border: `1px solid ${currentColor === UI.muted ? "#2A2560" : currentColor}`,
        color: currentColor,
        cursor: isPending ? "not-allowed" : "pointer",
        opacity: isPending ? 0.5 : 1,
        transition: "all 150ms ease",
        whiteSpace: "nowrap",
      }}
    >
      {ROLE_ORDER.map((r) => (
        <option key={r} value={r} style={{ background: "#0A0826", color: "#F5F5FA" }}>
          {ROLE_LABEL[r]}
        </option>
      ))}
    </select>
  );
}

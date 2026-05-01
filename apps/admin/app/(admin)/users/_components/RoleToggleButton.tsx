"use client";

import React, { useTransition } from "react";
import { updateUserRoleAction } from "../../_actions/user-actions";

const DANGER = "#FF4D6D";

interface RoleToggleButtonProps {
  userId: string;
  currentRole: string;
}

export function RoleToggleButton({
  userId,
  currentRole,
}: RoleToggleButtonProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const isAdmin = currentRole === "ADMIN";

  function handleClick() {
    const newRole = isAdmin ? "STUDENT" : "ADMIN";
    // SAFETY: newRole is always a valid literal
    startTransition(async () => {
      await updateUserRoleAction(userId, newRole);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title={isAdmin ? "Rétrograder en STUDENT" : "Promouvoir en ADMIN"}
      style={{
        padding: "5px 12px",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 9,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        background: "transparent",
        border: `1px solid ${isAdmin ? DANGER : "#2A2560"}`,
        color: isAdmin ? DANGER : "#6B6890",
        cursor: isPending ? "not-allowed" : "pointer",
        opacity: isPending ? 0.5 : 1,
        transition: "all 150ms ease",
        whiteSpace: "nowrap",
      }}
    >
      {isPending ? "…" : isAdmin ? "↓ Student" : "↑ Admin"}
    </button>
  );
}

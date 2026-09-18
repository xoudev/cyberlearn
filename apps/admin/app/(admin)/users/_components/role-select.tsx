"use client";

import React, { useTransition } from "react";
import type { UserRole } from "@cyberlearn/db";
import { Select } from "@cyberlearn/ui";
import { ROLE_LABEL, isUserRole, roleTone } from "@/lib/roles";
import { toneColor } from "../../_components/admin-ui";
import { updateUserRoleAction } from "../../_actions/user-actions";

/**
 * The role, stated and changed by the same control.
 *
 * The users list used to carry both: a tag in a "Rôle" column and this select
 * in an "Action" column beside it, showing the same word twice on every row.
 * One of them had to go, and it is the read-only one - a select already says
 * what the role is, and the tag could never say what it could become.
 *
 * It wears the role's own tone, from the same data-tone scale .a-tag reads, so
 * the control that hands out the keys to the console is red for exactly as
 * long as ADMIN is red anywhere else.
 */

// Least privileged first: a select reads as a ladder, and the ladder should
// climb. This is deliberately not the ROLES order, which is most-privileged
// first because that is how a filter list should read.
const ROLE_ORDER: readonly UserRole[] = ["STUDENT", "TEACHER", "ADMIN"];

export function RoleSelect({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}): React.ReactElement {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      block={false}
      triggerStyle={{
        height: 26,
        padding: "0 9px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        background: `color-mix(in srgb, ${toneColor(roleTone(currentRole))} 8%, transparent)`,
      }}
      value={currentRole}
      disabled={isPending}
      aria-label="Rôle de l'utilisateur"
      options={ROLE_ORDER.map((r) => ({
        value: r,
        label: ROLE_LABEL[r],
        tone: toneColor(roleTone(r)),
      }))}
      onChange={(next) => {
        // Guard rather than cast: the option list is ours, but the value comes
        // back out of the control as a plain string.
        if (!isUserRole(next) || next === currentRole) return;
        startTransition(async () => {
          await updateUserRoleAction(userId, next);
        });
      }}
    />
  );
}

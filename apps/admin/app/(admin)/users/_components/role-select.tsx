"use client";

import React, { useTransition } from "react";
import type { UserRole } from "@cyberlearn/db";
import { Select } from "@cyberlearn/ui";
import { notifyResult } from "@/lib/notify";
import { ROLE_LABEL, isUserRole, roleChangeQuestion, roleTone } from "@/lib/roles";
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
 *
 * Picking a role asks first. The select sits in a sorted, searchable table
 * where the row under the pointer is not always the row one meant, and the
 * change it makes is a privilege: the question names the account and the role
 * so that the click is a decision. What the server answers is said in a toast:
 * the new role, or its refusal (oneself, the last administrator), the control
 * then staying on the current role.
 */

// Least privileged first: a select reads as a ladder, and the ladder should
// climb. This is deliberately not the ROLES order, which is most-privileged
// first because that is how a filter list should read.
const ROLE_ORDER: readonly UserRole[] = ["STUDENT", "TEACHER", "ADMIN"];

export function RoleSelect({
  userId,
  handle,
  currentRole,
}: {
  userId: string;
  /** How the account is named in the confirmation. */
  handle: string;
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
        if (!window.confirm(roleChangeQuestion(handle, currentRole, next))) return;
        startTransition(async () => {
          const result = await updateUserRoleAction(userId, next);
          notifyResult(result, {
            success: `${handle} a désormais le rôle ${ROLE_LABEL[next]}.`,
            error: "Le changement de rôle a échoué.",
          });
        });
      }}
    />
  );
}

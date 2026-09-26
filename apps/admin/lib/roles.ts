import type { UserRole } from "@cyberlearn/db";
import type { Tone } from "../app/(admin)/_components/admin-ui";

/**
 * How a role is named and coloured in the console, in one place.
 *
 * It was in four: a label map on the users list, a second label list inside the
 * role select, a third in the filter facet, and a two-branch ternary on the
 * dashboard that predated TEACHER and therefore painted a teacher exactly like
 * a student and printed the raw enum next to them. Nothing connected them, so
 * adding a role updated three of the four and left the fourth quietly wrong.
 *
 * Typing the records on UserRole is what makes that impossible to repeat: a new
 * value in the Prisma enum stops the build here until it is named and toned,
 * rather than showing up in the interface as "STUDENT" in grey.
 */
export const ROLE_LABEL: Record<UserRole, string> = {
  STUDENT: "Étudiant",
  TEACHER: "Professeur",
  ADMIN: "Admin",
};

// Admin is danger, not accent. The role select had it red and the tag beside it
// turquoise; red is the one that says something - a control that grants the
// keys to the console should look like it - so the tags follow the select
// rather than the other way round.
const ROLE_TONE: Record<UserRole, Tone> = {
  STUDENT: "neutral",
  TEACHER: "info",
  ADMIN: "danger",
};

/** Most privileged first - the order every role list in the console uses. */
export const ROLES: readonly UserRole[] = ["ADMIN", "TEACHER", "STUDENT"];

/** A role read back off the DOM or out of a query string is a plain string. */
export function isUserRole(value: string): value is UserRole {
  return value in ROLE_LABEL;
}

export function roleLabel(role: string): string {
  return isUserRole(role) ? ROLE_LABEL[role] : role;
}

export function roleTone(role: string): Tone {
  return isUserRole(role) ? ROLE_TONE[role] : "neutral";
}

/**
 * Sort key for a role column: most privileged first, not alphabetical.
 *
 * Sorting on the raw enum gives ADMIN, STUDENT, TEACHER - which is neither the
 * ladder nor anything a reader expects, and it changes meaning the day a role
 * is renamed. The rank follows ROLES, so the order is stated once.
 */
export function roleRank(role: string): number {
  return isUserRole(role) ? ROLES.indexOf(role) : ROLES.length;
}

import type { AuditRow } from "@cyberlearn/db";
import { CSV_BOM, csvCell, csvLine } from "@cyberlearn/lib/files/csv";

/**
 * The audit log as a CSV file: what the export route streams, one line per
 * entry, under the filter the page shows.
 *
 * Semicolons, and a byte-order mark: that is what a French spreadsheet opens
 * as columns and as UTF-8 without asking. Every cell is quoted. The cells and
 * their formula guard are the site's class export's too: one copy, in
 * @cyberlearn/lib, handed on from here for the route and its tests.
 */
export { CSV_BOM, csvCell, csvLine };

/** The most entries one export writes. Past it the page asks for a narrower filter. */
export const AUDIT_EXPORT_MAX = 50_000;

/** Entries read per query while streaming. */
export const AUDIT_EXPORT_BATCH = 500;

export const AUDIT_CSV_HEADER = [
  "Horodatage (UTC)",
  "Action",
  "Acteur",
  "Identifiant de l'acteur",
  "Type de cible",
  "Identifiant de la cible",
  "Métadonnées",
] as const;

/** Who did it, as the export names them: the handle without its @, else the address. */
export function auditActorName(row: {
  actor: Pick<NonNullable<AuditRow["actor"]>, "username" | "email"> | null;
  anonymized: boolean;
}): string {
  if (row.actor !== null) return row.actor.username ?? row.actor.email;
  // No account behind the row: one deleted since, or a job that ran alone.
  return row.anonymized ? "compte supprimé" : "système";
}

export function auditCsvLine(row: AuditRow): string {
  return csvLine([
    row.createdAt.toISOString(),
    row.action,
    auditActorName(row),
    row.actorId ?? "",
    row.targetType,
    row.targetId ?? "",
    row.metadata === null ? "" : JSON.stringify(row.metadata),
  ]);
}

/** "audit-log-2026-10-12.csv", dated in Paris, where the console is read. */
export function auditExportFilename(now: Date): string {
  const day = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return `audit-log-${day}.csv`;
}

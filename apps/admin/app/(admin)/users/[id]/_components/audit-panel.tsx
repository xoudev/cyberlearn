import React from "react";
import Link from "next/link";
import type { AuditRow } from "@cyberlearn/db";
import { auditActorName } from "@/lib/audit-export";
import { Card } from "../../../_components/admin-ui";

const stamp = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

/**
 * The latest lines of the audit log about this account: what was done to it,
 * and what it did as an administrator. The full log, filtered on either side,
 * is one click away.
 */
export function AuditPanel({
  userId,
  rows,
}: {
  userId: string;
  rows: AuditRow[];
}): React.ReactElement {
  return (
    <Card
      title="Journal d'audit"
      action={
        <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/audit?target=${userId}`} className="a-btn a-btn--ghost a-btn--sm">
            Visant ce compte
          </Link>
          <Link href={`/audit?actor=${userId}`} className="a-btn a-btn--ghost a-btn--sm">
            Faits par ce compte
          </Link>
        </span>
      }
    >
      {rows.length === 0 ? (
        <div className="a-card-pad">
          <p className="a-field-hint">Aucune ligne du journal ne concerne ce compte.</p>
        </div>
      ) : (
        <div className="a-table-wrap">
          <table className="a-table">
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="mono" style={{ overflowWrap: "anywhere" }}>
                    {row.action}
                  </td>
                  <td className="a-field-hint">
                    {row.actorId === userId
                      ? row.targetId === userId
                        ? "par ce compte, sur lui-même"
                        : `par ce compte · ${row.targetType}`
                      : `par ${auditActorName(row)}`}
                  </td>
                  <td align="right" className="mono a-field-hint" style={{ whiteSpace: "nowrap" }}>
                    {stamp.format(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

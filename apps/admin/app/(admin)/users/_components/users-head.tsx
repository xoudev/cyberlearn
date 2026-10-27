import React from "react";
import Link from "next/link";
import { KpiCard } from "../../_components/admin-ui";
import { USER_KPI_LABELS } from "./columns";

/**
 * What both account lists show above their grid, under the page header: the
 * figures over every account, and the tabs between the accounts and the
 * sign-ups that have none yet.
 */

export type UsersTab = "accounts" | "pending";

export function UsersKpis({
  counts,
}: {
  counts: { total: number; admins: number; activeWeek: number };
}): React.ReactElement {
  return (
    <div className="a-kpi-grid">
      <KpiCard label={USER_KPI_LABELS[0]} value={counts.total.toLocaleString("fr-FR")} />
      <KpiCard
        label={USER_KPI_LABELS[1]}
        value={counts.admins.toLocaleString("fr-FR")}
        tone="info"
      />
      <KpiCard
        label={USER_KPI_LABELS[2]}
        value={counts.activeWeek.toLocaleString("fr-FR")}
        tone="success"
      />
      <KpiCard
        label={USER_KPI_LABELS[3]}
        value={
          counts.total > 0
            ? `${String(Math.round((counts.activeWeek / counts.total) * 100))}%`
            : "n.d."
        }
        tone="success"
      />
    </div>
  );
}

export function UsersTabs({ current }: { current: UsersTab }): React.ReactElement {
  return (
    <nav className="a-tabs" aria-label="Listes de comptes">
      <Link
        href="/users"
        className="a-tab"
        aria-current={current === "accounts" ? "page" : undefined}
      >
        Comptes
      </Link>
      <Link
        href="/users/pending"
        className="a-tab"
        aria-current={current === "pending" ? "page" : undefined}
      >
        Inscriptions en attente
      </Link>
    </nav>
  );
}

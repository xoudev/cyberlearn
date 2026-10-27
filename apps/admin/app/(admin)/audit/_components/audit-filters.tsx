"use client";

import React, { useId, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select } from "@cyberlearn/ui";
import { gridHref } from "@/lib/grid-href";
import { AUDIT_FILTER_LABELS } from "./columns";

/**
 * The audit log's filters: who, on what, which action, between which days,
 * and whether the scheduled jobs' runs, hidden by default, are shown too.
 *
 * A GET form, so the filter is the URL: it can be linked to (an account's
 * page opens its own trail this way) and the export reads the same one. With
 * scripts, the submit goes through the router and leaves out the empty fields.
 */

const FIELDS = ["actor", "target", "action", "from", "to", "crons"] as const;

export function AuditFilters({
  params,
  actions,
}: {
  /** The filters the server understood, as the URL carries them. */
  params: Readonly<Record<string, string>>;
  /** Every action the console writes, and every other the log holds. */
  actions: readonly string[];
}): React.ReactElement {
  const router = useRouter();
  const actionLabel = useId();
  const [pending, startTransition] = useTransition();
  const filtered = FIELDS.some((field) => (params[field] ?? "") !== "");
  // What a reset keeps: the order, which is not a filter.
  const resetHref = gridHref("/audit", params.sort === undefined ? {} : { sort: params.sort });

  return (
    <form
      // A new URL (a reset, a link from an account) brings new defaults.
      key={JSON.stringify(params)}
      className="a-filters"
      action="/audit"
      method="get"
      aria-label="Filtrer le journal"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const changes: Record<string, string | null> = {};
        for (const field of FIELDS) {
          const value = data.get(field);
          changes[field] = typeof value === "string" && value.trim() !== "" ? value.trim() : null;
        }
        startTransition(() => {
          router.push(gridHref("/audit", params, changes), { scroll: false });
        });
      }}
    >
      <label className="a-filter">
        {AUDIT_FILTER_LABELS.actor}
        <input
          name="actor"
          className="a-input a-input--sm"
          defaultValue={params.actor ?? ""}
          placeholder="Adresse, @pseudo, identifiant"
          maxLength={100}
        />
      </label>
      <label className="a-filter">
        {AUDIT_FILTER_LABELS.target}
        <input
          name="target"
          className="a-input a-input--sm"
          defaultValue={params.target ?? ""}
          placeholder="Identifiant, ou un type : Lesson"
          maxLength={100}
        />
      </label>
      <div className="a-filter">
        <span id={actionLabel}>{AUDIT_FILTER_LABELS.action}</span>
        <Select
          name="action"
          block={false}
          aria-labelledby={actionLabel}
          defaultValue={params.action ?? ""}
          triggerStyle={{ height: 44, fontSize: 12, padding: "0 10px", minWidth: 200 }}
          options={[
            { value: "", label: "Toutes" },
            ...actions.map((action) => ({ value: action, label: action })),
          ]}
        />
      </div>
      <label className="a-filter">
        {AUDIT_FILTER_LABELS.from}
        <input
          type="date"
          name="from"
          className="a-input a-input--sm"
          defaultValue={params.from ?? ""}
        />
      </label>
      <label className="a-filter">
        {AUDIT_FILTER_LABELS.to}
        <input
          type="date"
          name="to"
          className="a-input a-input--sm"
          defaultValue={params.to ?? ""}
        />
      </label>
      <label className="a-filter">
        {AUDIT_FILTER_LABELS.crons}
        <span className="a-filter-check">
          <input type="checkbox" name="crons" value="1" defaultChecked={params.crons === "1"} />
          Afficher leurs passages
        </span>
      </label>
      {params.sort !== undefined && <input type="hidden" name="sort" value={params.sort} />}
      <div className="a-filter-actions">
        <button type="submit" className="a-btn a-btn--ghost a-btn--sm" disabled={pending}>
          {pending ? "Filtrage…" : "Filtrer"}
        </button>
        {filtered && (
          <Link href={resetHref} className="a-toolbar-reset" scroll={false}>
            Réinitialiser
          </Link>
        )}
      </div>
    </form>
  );
}

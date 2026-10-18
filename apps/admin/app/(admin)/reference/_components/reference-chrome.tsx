import React from "react";
import Link from "next/link";
import { REFERENCE_TABS, type ReferenceSource, type ReferenceTab } from "./reference-head";

/**
 * What every reference list shows between its header and its grid: the tabs
 * between the five lists, and the notice that says the list is read-only,
 * which file writes its rows, and how a change reaches the database.
 */
export function ReferenceChrome({
  current,
  source,
}: {
  current: ReferenceTab;
  source: ReferenceSource;
}): React.ReactElement {
  return (
    <>
      <nav className="a-tabs" aria-label="Référentiels">
        {REFERENCE_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className="a-tab"
            aria-current={tab.key === current ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <p className="a-form-notice" style={{ marginBottom: 18 }}>
        Consultation seule. Ces lignes sont {source.how} :{" "}
        <span className="a-mono">{source.file}</span>. Une modification faite ici serait écrasée ou
        contredite par le dépôt. {source.change}
      </p>
    </>
  );
}

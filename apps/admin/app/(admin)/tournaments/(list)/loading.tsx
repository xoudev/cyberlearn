import React from "react";
import { Skeleton } from "@cyberlearn/ui";
import { Card, PageHeader } from "../../_components/admin-ui";
import { ActionsSkeleton } from "../../_components/data-grid-skeleton";
import { TOURNAMENTS_HEADER } from "../_components/tournament-head";

/** The tournaments while they load: one row per tournament, its title over its period, its phase. */
export default function AdminTournamentsLoading(): React.ReactElement {
  return (
    <main className="a-page" aria-busy="true">
      <PageHeader
        crumbs={TOURNAMENTS_HEADER.crumbs}
        title={TOURNAMENTS_HEADER.title}
        description={TOURNAMENTS_HEADER.description}
        actions={<ActionsSkeleton widths={[170]} />}
      />
      <Card>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }} aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <li
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 12,
                padding: "14px 18px",
                borderBottom: "1px solid var(--a-border)",
              }}
            >
              <span style={{ display: "grid", gap: 4 }}>
                <Skeleton as="span" w={220} h={14} />
                <Skeleton as="span" w="70%" h={11} />
              </span>
              <Skeleton as="span" w={80} h={18} />
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SupportHeaderSkeleton } from "./_components/support-skeleton";

/**
 * The list of requests while it loads, drawn on the page's own classes: the
 * header, the "Nouvelle demande" button, then the .tk-list rows with their
 * subject, meta line and status.
 */

const SUBJECTS = ["46%", "62%", "38%", "54%", "44%"] as const;

export default function SupportLoading(): React.ReactElement {
  return (
    <div className="page-container" aria-busy="true" aria-label="Chargement de tes demandes">
      <SupportHeaderSkeleton crumb={250} eyebrow={197} title="6.2em" ledeLines={2} ledeLast="32%" />

      <div style={{ marginBottom: 24 }} aria-hidden="true">
        <Skeleton w={146} h={34} />
      </div>

      <ul className="tk-list" aria-hidden="true">
        {SUBJECTS.map((subject) => (
          <li key={subject}>
            <div className="tk-row">
              <div className="tk-row__body">
                <Skeleton w={subject} h={15} style={{ margin: "3.75px 0" }} />
                <Skeleton w={252} h={10} style={{ maxWidth: "100%", margin: "2px 0" }} />
              </div>
              {/* .tk-status draws its border in the status's colour: a bar of
                  its size instead. */}
              <Skeleton w={84} h={20} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

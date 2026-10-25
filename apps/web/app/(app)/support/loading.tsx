import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import "./support.css";

/**
 * The list of requests while it loads, drawn on the page's own classes: the
 * header, the "Nouvelle demande" button, then the .tk-list rows with their
 * subject, meta line and status.
 */

const SUBJECTS = ["46%", "62%", "38%", "54%", "44%"] as const;

export default function SupportLoading(): React.ReactElement {
  return (
    <div
      className="page-container learning-catalogue learning-workspace community-workspace support-workspace"
      aria-busy="true"
      aria-label="Chargement de tes demandes"
    >
      <div className="catalogue-masthead" aria-hidden="true">
        <div>
          <Skeleton w={197} h={12} style={{ marginBottom: 20 }} />
          <Skeleton w="min(65vw,600px)" h={76} />
          <Skeleton w="min(65vw,420px)" h={14} style={{ marginTop: 20 }} />
        </div>
      </div>
      <div className="catalogue-ledger" aria-hidden="true">
        <Skeleton w={110} h={26} />
        <Skeleton w={110} h={26} />
      </div>
      <div className="support-overview" aria-hidden="true">
        <div className="support-overview__body">
          <Skeleton w="70%" h={44} />
          <Skeleton w="90%" h={48} style={{ marginBlock: 24 }} />
          <Skeleton w={160} h={44} />
        </div>
        <div className="support-overview__aside">
          <Skeleton w={64} h={64} />
          <Skeleton w="90%" h={48} />
        </div>
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

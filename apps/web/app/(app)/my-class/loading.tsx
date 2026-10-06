import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ClassHeaderSkeleton } from "./_components/class-skeletons";

/**
 * The class page while it loads, drawn on its own classes (.cls-*): the
 * header, then a student's class card (StudentClass), the view most accounts
 * get: where the class sits, its teachers, the strip of four figures and the
 * ranked roster with its bars.
 */

const NAMES = ["42%", "55%", "36%", "48%", "60%", "40%", "52%", "45%"] as const;

export default function MyClassLoading(): React.ReactElement {
  return (
    <div className="page-container" aria-busy="true" aria-label="Chargement de la classe">
      <ClassHeaderSkeleton crumb={227} eyebrow={260} title="5.4em" ledeLines={2} ledeLast="38%" />

      <div className="cls-stack" aria-hidden="true">
        <div className="cls-card">
          <div className="cls-card__eyebrow">
            <Skeleton w={260} h={10} style={{ maxWidth: "100%", margin: "2.5px 0" }} />
          </div>
          <div className="cls-card__title">
            <Skeleton w={170} h={22} style={{ margin: "5.5px 0" }} />
          </div>

          <div className="cls-subhead">
            <Skeleton w={118} h={10} style={{ margin: "2.5px 0" }} />
          </div>
          <ul className="cls-teachers">
            {[112, 92].map((width) => (
              <li key={width} className="cls-teacher">
                <Skeleton w={28} h={28} />
                <span className="cls-teacher__body">
                  <Skeleton w={width} h={12} style={{ margin: "2.75px 0" }} />
                  <Skeleton w={70} h={9} style={{ margin: "2.25px 0" }} />
                </span>
              </li>
            ))}
          </ul>

          <div className="cls-stats">
            {[84, 92, 104, 52].map((label) => (
              <div key={label} className="cls-stat">
                <Skeleton w={40} h={18} style={{ margin: "1.5px 0" }} />
                <div className="cls-stat__label">
                  <Skeleton w={label} h={9} style={{ margin: "2.6px 0" }} />
                </div>
              </div>
            ))}
          </div>

          <div className="cls-subhead">
            <Skeleton w={70} h={10} style={{ margin: "2.5px 0" }} />
          </div>
          <ol className="cls-people cls-people--ranked">
            {NAMES.map((name) => (
              <li key={name} className="cls-person">
                <span className="cls-person__rank">
                  <Skeleton w={14} h={10} />
                </span>
                <span className="cls-person__name">
                  <Skeleton w={name} h={13} style={{ margin: "4px 0" }} />
                </span>
                <Skeleton className="cls-person__bar" h={4} />
                <span className="cls-person__meta">
                  <Skeleton w={140} h={10} style={{ margin: "3px 0 3px auto" }} />
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

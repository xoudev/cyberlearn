import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "./_components/mock-exam.css";
import "@/components/assessment-workspace.css";

function StatSkeleton(): React.ReactElement {
  return (
    <li className="mkx-stat">
      <Skeleton w={48} h={28} style={{ margin: "0 auto" }} />
      <Skeleton w={64} h={9} style={{ margin: "9px auto 0" }} />
    </li>
  );
}

function HeadSkeleton({ title, meta }: { title: number; meta: number }): React.ReactElement {
  return (
    <div className="mkx-head">
      <Skeleton w={title} h={11} style={{ maxWidth: "70%" }} />
      <Skeleton w={meta} h={10} />
    </div>
  );
}

export default function MockExamLoading(): React.ReactElement {
  return (
    <div
      className="page-container mkx learning-catalogue learning-workspace assessment-workspace"
      aria-busy="true"
      aria-label="Chargement de l'examen blanc"
    >
      <Skeleton w={320} h={14} style={{ maxWidth: "100%", marginBottom: 26 }} />

      <div className="mkx-intro" aria-hidden="true">
        <div className="mkx-intro__main">
          <div className="mkx-eyebrow">
            <Skeleton w={140} h={12} />
          </div>
          <Skeleton w="82%" h="clamp(34px, 4.2vw, 56px)" style={{ marginBottom: 8 }} />
          <Skeleton w="46%" h="clamp(34px, 4.2vw, 56px)" style={{ marginBottom: 20 }} />
          <SkeletonText
            lines={3}
            lastWidth="46%"
            lineHeight={14}
            gap={11}
            style={{ maxWidth: "62ch", marginBottom: 32 }}
          />
          <div className="assessment-departure">
            <ul className="mkx-stats">
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </ul>
            <ul className="mkx-rules">
              {[0, 1, 2].map((i) => (
                <li key={i}>
                  <Skeleton w={72} h={10} style={{ marginTop: 3 }} />
                  <SkeletonText lines={2} lastWidth="58%" lineHeight={12} gap={8} />
                </li>
              ))}
            </ul>
            <div className="mkx-cta">
              <Skeleton h={52} style={{ flex: "1 1 260px" }} />
              <Skeleton w={160} h={11} style={{ alignSelf: "center" }} />
            </div>
          </div>
        </div>

        <div className="mkx-intro__side">
          <div>
            <HeadSkeleton title={190} meta={70} />
            <ul className="mkx-mods mkx-mods--loading">
              {["62%", "48%", "70%", "54%"].map((w) => (
                <li key={w}>
                  <Skeleton w={300} h={14} style={{ maxWidth: w }} />
                  <Skeleton w={84} h={11} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <HeadSkeleton title={180} meta={150} />
            <ol className="mkx-hist">
              {[0, 1, 2].map((i) => (
                <li key={i}>
                  <Skeleton w={64} h={12} />
                  <Skeleton h={6} />
                  <Skeleton w={42} h={13} />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Skeleton, SkeletonText } from "@cyberlearn/ui";
import "./_components/mock-exam.css";
import "@/components/assessment-workspace.css";

function StatSkeleton(): React.ReactElement {
  return (
    <li className="mkx-stat">
      <Skeleton w={64} h={12} />
      <Skeleton w={56} h={44} />
    </li>
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
          <div className="mkx-departure">
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
        {/* .pg-title here: clamp(32px, 4vw, 52px); the paths' titles (21-30
            characters) wrap to two lines at that size. */}
        <Skeleton w="82%" h="clamp(30px, 3.8vw, 48px)" style={{ marginBottom: 8 }} />
        <Skeleton w="46%" h="clamp(30px, 3.8vw, 48px)" style={{ marginBottom: 24 }} />
        <Skeleton w={210} h={12} style={{ marginBottom: 30 }} />
        <div className="mkx-cta">
          <Skeleton w={160} h={11} style={{ alignSelf: "center" }} />
        </div>
      </div>
    </div>
  );
}

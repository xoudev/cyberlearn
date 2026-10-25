import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "./challenge-detail.css";

export default function ChallengeLoading(): React.ReactElement {
  return (
    <div
      className="page-container learning-catalogue learning-workspace challenge-workspace"
      aria-busy="true"
      aria-label="Chargement du défi"
    >
      <div aria-hidden="true">
        <Skeleton w="min(100%, 320px)" h={14} />
        <div className="challenge-hero">
          <Skeleton w={160} h={12} style={{ marginBottom: 24 }} />
          <Skeleton w="85%" h={64} style={{ marginBottom: 12 }} />
          <Skeleton w="60%" h={64} style={{ marginBottom: 24 }} />
          <SkeletonText lines={2} lineHeight={15} gap={12} />
        </div>
        <div className="challenge-brief">
          <div className="challenge-facts">
            {[0, 1, 2, 3].map((item) => (
              <div key={item}>
                <Skeleton w="80%" h={12} />
                <Skeleton w="70%" h={44} style={{ marginTop: 16 }} />
              </div>
            ))}
          </div>
          <div className="challenge-brief__actions">
            <Skeleton w={220} h={44} />
          </div>
        </div>
        <div className="chx-body">
          <div>
            <Skeleton w={180} h={32} style={{ marginBottom: 28 }} />
            <SkeletonText lines={5} lineHeight={15} gap={14} />
            <Skeleton h={180} style={{ marginTop: 30 }} />
          </div>
          <aside className="chx-rail">
            <Skeleton w={140} h={32} style={{ marginBottom: 24 }} />
            {[0, 1].map((item) => (
              <Skeleton key={item} h={80} style={{ marginBottom: 12 }} />
            ))}
          </aside>
        </div>
      </div>
    </div>
  );
}

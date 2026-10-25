import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "./exam.css";
import "@/components/assessment-workspace.css";

export default function ExamLoading(): React.ReactElement {
  return (
    <div
      className="exam-root learning-catalogue learning-workspace assessment-workspace"
      aria-busy="true"
      aria-label="Chargement de l’examen"
    >
      <div className="exam-stage" aria-hidden="true">
        <div className="exam-frame">
          <div className="assessment-brand">
            <Skeleton w={36} h={40} />
            <Skeleton w={180} h={14} />
          </div>
          <div className="exam-body">
            <div className="exam-left">
              <Skeleton w={150} h={12} style={{ marginBottom: 20 }} />
              <Skeleton w="85%" h={64} style={{ marginBottom: 12 }} />
              <Skeleton w="65%" h={64} style={{ marginBottom: 24 }} />
              <SkeletonText lines={3} lineHeight={15} gap={12} style={{ marginBottom: 28 }} />
              <div className="exam-departure">
                <div className="exam-stats">
                  {[0, 1, 2].map((item) => (
                    <div className="exam-stat" key={item}>
                      <Skeleton w="80%" h={12} />
                      <Skeleton w={48} h={48} style={{ marginTop: 12 }} />
                    </div>
                  ))}
                </div>
                <Skeleton w="100%" h={48} />
              </div>
            </div>
            <aside className="exam-right">
              <Skeleton w="75%" h={36} style={{ marginBottom: 24 }} />
              <div className="assessment-rules">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} style={{ paddingBlock: 24 }}>
                    <Skeleton w="70%" h={16} style={{ marginBottom: 12 }} />
                    <SkeletonText lines={2} lineHeight={13} gap={10} />
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

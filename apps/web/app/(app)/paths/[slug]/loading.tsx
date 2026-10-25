import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "./path-detail.css";

export default function PathDetailLoading(): React.ReactElement {
  return (
    <div
      className="page-container learning-catalogue learning-workspace path-workspace"
      aria-busy="true"
      aria-label="Chargement du parcours"
    >
      <div aria-hidden="true">
        <Skeleton w="min(100%, 330px)" h={14} />
        <div className="path-hero">
          <div className="path-loading-heading">
            <Skeleton w="45%" h={12} />
            <Skeleton w="70%" h={16} />
            <Skeleton w="90%" h={64} />
            <Skeleton w="62%" h={64} />
            <SkeletonText lines={2} lineHeight={15} gap={12} />
          </div>
          <Skeleton h={340} />
        </div>
        <div className="path-departure">
          <div className="path-departure__progress">
            <Skeleton w={120} h={12} />
            <Skeleton w="80%" h={56} style={{ marginBlock: 20 }} />
            <Skeleton h={8} />
            <Skeleton w="80%" h={44} style={{ marginTop: 24 }} />
          </div>
          <div className="brief__grid">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className={item === 2 ? "brief__cell brief__cell--cert" : "brief__cell"}
              >
                <Skeleton w="80%" h={48} />
              </div>
            ))}
          </div>
        </div>
        <div className="path-body">
          <div className="path-curriculum">
            <Skeleton w="65%" h={34} style={{ marginBottom: 28 }} />
            <header className="path-module__head">
              <div>
                <Skeleton w="70%" h={30} />
              </div>
              <span className="path-module__gate" />
              <div className="path-module__tools">
                <Skeleton w={110} h={44} />
              </div>
            </header>
            <ol className="path-module__missions">
              {[0, 1, 2].map((item) => (
                <li
                  className="path-map-row"
                  data-side={item % 2 === 0 ? "left" : "right"}
                  key={item}
                >
                  <span className="path-map-node">
                    <Skeleton w={18} h={18} />
                  </span>
                  <div className="path-mission">
                    <Skeleton w="70%" h={12} style={{ marginBottom: 18 }} />
                    <div>
                      <Skeleton w="80%" h={32} />
                      <Skeleton w="65%" h={14} style={{ marginTop: 20 }} />
                      <Skeleton w={150} h={44} style={{ marginTop: 20 }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <aside className="path-aside">
            <div className="ablock">
              <Skeleton w="75%" h={60} style={{ marginBottom: 24 }} />
              <SkeletonText lines={5} lineHeight={14} gap={14} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

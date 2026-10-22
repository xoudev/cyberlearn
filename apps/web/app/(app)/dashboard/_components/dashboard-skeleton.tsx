import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "../dashboard.css";
import { brandTypeface } from "@/components/brand-typeface";

export function DashboardSkeleton(): React.JSX.Element {
  return (
    <div
      className={`learning-dashboard ${brandTypeface}`}
      aria-busy="true"
      aria-label="Chargement du tableau de bord"
    >
      <div className="dash" aria-hidden="true">
        <section className="dash-hero">
          <div>
            <Skeleton w={150} h={11} />
            <Skeleton w={240} h={38} style={{ marginBlock: 14 }} />
            <Skeleton w={230} h={12} />
          </div>
          <Skeleton w={285} h={68} />
        </section>
        <section className="dash-now">
          <div className="dash-now-main">
            <Skeleton w={160} h={12} />
            <Skeleton w="80%" h={38} style={{ marginBlock: 26 }} />
            <SkeletonText lines={3} lastWidth="60%" />
            <Skeleton w={210} h={48} style={{ marginTop: 28 }} />
          </div>
          <div className="dash-route">
            <Skeleton w={180} h={13} />
            <div className="learning-skeleton-chapters">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} w="100%" h={53} />
              ))}
            </div>
          </div>
        </section>
        <div className="learning-grid">
          <div className="learning-primary">
            <section className="dash-sec">
              <Skeleton w={150} h={16} style={{ marginBottom: 18 }} />
              <div className="dash-week">
                <Skeleton w="100%" h={205} />
                <Skeleton w="100%" h={205} />
              </div>
            </section>
          </div>
          <aside className="learning-aside">
            <Skeleton w="100%" h={240} />
            <Skeleton w="100%" h={270} />
          </aside>
        </div>
      </div>
    </div>
  );
}

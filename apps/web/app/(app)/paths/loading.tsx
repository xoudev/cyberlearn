import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import "./_components/paths-catalog-v2.css";

export default function PathsLoading(): React.ReactElement {
  return (
    <div
      className="pc2-root learning-catalogue"
      aria-busy="true"
      aria-label="Chargement des parcours"
    >
      <div className="pc2" aria-hidden="true">
        <div className="catalogue-heading">
          <div>
            <Skeleton w={140} h={12} style={{ marginBottom: 22 }} />
            <Skeleton w="55%" h={72} style={{ marginBottom: 8 }} />
            <Skeleton w="90%" h={72} style={{ marginBottom: 24 }} />
            <SkeletonText lines={2} lastWidth="65%" lineHeight={15} gap={10} />
          </div>
          <div className="catalogue-summary">
            <Skeleton w={100} h={72} />
            <Skeleton w="90%" h={14} style={{ marginBlock: 24 }} />
            <SkeletonText lines={2} lastWidth="75%" lineHeight={12} gap={8} />
            <Skeleton w="100%" h={44} style={{ marginTop: 20 }} />
          </div>
        </div>
        <div className="pc2-filters catalogue-tools">
          {[70, 100, 62, 84, 130].map((w) => (
            <Skeleton key={w} w={w} h={44} />
          ))}
          <div className="pc2-search">
            <Skeleton w="100%" h={46} />
          </div>
        </div>
        <div className="pc2-section">
          <Skeleton w={160} h={30} />
        </div>
        <div className="hero-path">
          <div className="hero-path__main">
            <Skeleton w="70%" h={16} style={{ marginBottom: 28 }} />
            <Skeleton w="90%" h={48} style={{ marginBottom: 20 }} />
            <SkeletonText lines={2} lastWidth="75%" lineHeight={14} gap={9} />
            <div className="hero-path__stats">
              <Skeleton w="80%" h={14} />
            </div>
            <Skeleton w="100%" h={12} />
            <div className="hero-path__cta-row">
              <Skeleton w="70%" h={46} />
            </div>
          </div>
          <div className="hero-path__console">
            <div className="hero-glyph">
              <Skeleton w={100} h={100} />
            </div>
            <div className="hero-next">
              <Skeleton w="80%" h={24} />
            </div>
          </div>
        </div>
        <div className="pc2-section">
          <Skeleton w={180} h={30} />
        </div>
        <div className="pc2-discover">
          {[0, 1].map((n) => (
            <div className="game-card" key={n}>
              <Skeleton w="100%" h={160} />
              <div className="game-card__body">
                <Skeleton w="85%" h={34} />
                <SkeletonText lines={2} lastWidth="65%" lineHeight={14} gap={9} />
              </div>
              <div className="game-card__foot">
                <Skeleton w="100%" h={44} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

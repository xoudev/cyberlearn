import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { brandTypeface } from "@/components/brand-typeface";
import "@/app/(app)/paths/_components/paths-catalog-v2.css";
import "./catalogue.css";

export default function CatalogueLoading(): React.ReactElement {
  return (
    <div
      className={`public-catalogue__main learning-catalogue ${brandTypeface}`}
      aria-busy="true"
      aria-label="Chargement du catalogue"
    >
      <div aria-hidden="true">
        <div className="catalogue-heading">
          <div>
            <Skeleton w={140} h={12} style={{ marginBottom: 22 }} />
            <Skeleton w="55%" h={72} style={{ marginBottom: 8 }} />
            <Skeleton w="90%" h={72} style={{ marginBottom: 24 }} />
            <SkeletonText lines={2} lastWidth="65%" lineHeight={15} gap={10} />
          </div>
          <div className="catalogue-summary">
            <Skeleton w={100} h={72} />
            <SkeletonText
              lines={2}
              lastWidth="70%"
              lineHeight={12}
              gap={8}
              style={{ marginTop: 24 }}
            />
          </div>
        </div>
        <div className="public-catalogue__filters catalogue-tools">
          <div className="public-catalogue__pills">
            {[70, 100, 62, 84].map((w) => (
              <Skeleton key={w} w={w} h={44} />
            ))}
          </div>
          <Skeleton w="min(100%, 340px)" h={46} />
        </div>
        <div className="public-catalogue__result-count">
          <Skeleton w={140} h={12} />
        </div>
        <div className="public-catalogue__paths pc2-root">
          <div className="pc2-discover">
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="game-card">
                <Skeleton w="100%" h={160} />
                <div className="game-card__body">
                  <Skeleton w="80%" h={34} />
                  <SkeletonText lines={2} lastWidth="65%" lineHeight={14} gap={9} />
                  <Skeleton w="70%" h={14} style={{ marginTop: 18 }} />
                </div>
                <div className="game-card__foot">
                  <Skeleton w="100%" h={44} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

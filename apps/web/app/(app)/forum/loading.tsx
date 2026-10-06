import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { ForumHeaderSkeleton, TopicRowSkeleton } from "./_components/forum-skeleton";
import "./forum.css";

/**
 * The forum's front page while it loads, drawn on the page's own classes
 * (forum.css): the header, the grid of the five sections, then the latest
 * threads.
 */

const TOPIC_TITLES = ["62%", "48%", "70%", "40%", "56%", "66%", "44%", "58%"] as const;

/** One section's card (.fo-cat): its name, its description, its counts. */
function CategorySkeleton(): React.ReactElement {
  return (
    <div className="fo-cat">
      <Skeleton w="44%" h={17} style={{ margin: "4px 0" }} />
      <SkeletonText
        lines={2}
        lastWidth="62%"
        lineHeight={12}
        gap={8}
        style={{ flex: 1, paddingBlock: 4 }}
      />
      <div className="fo-cat-meta">
        <Skeleton w={62} h={10} style={{ margin: "2px 0" }} />
        <Skeleton w={112} h={10} style={{ margin: "2px 0" }} />
      </div>
    </div>
  );
}

export default function ForumLoading(): React.ReactElement {
  return (
    // .fo-page is a flex item with auto margins: the real page reaches its
    // max-width through its text, which bars do not have, hence the width.
    <div
      className="fo-page"
      style={{ width: "100%" }}
      aria-busy="true"
      aria-label="Chargement du forum"
    >
      <ForumHeaderSkeleton eyebrow={232} title="4.4em" ledeLines={2} ledeLast="55%" />

      <div className="fo-grid" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <CategorySkeleton key={i} />
        ))}
      </div>

      <div className="fo-section-head" aria-hidden="true">
        <Skeleton w={188} h={12} style={{ margin: "2px 0" }} />
      </div>
      <ul className="fo-list" aria-hidden="true">
        {TOPIC_TITLES.map((title, i) => (
          <TopicRowSkeleton key={i} title={title} />
        ))}
      </ul>
    </div>
  );
}

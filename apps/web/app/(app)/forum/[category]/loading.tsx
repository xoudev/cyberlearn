import React from "react";
import {
  CrumbsSkeleton,
  ForumHeaderSkeleton,
  TopicRowSkeleton,
} from "../_components/forum-skeleton";
import "../forum.css";

/**
 * One section of the forum while it loads, drawn on the page's own classes
 * (forum.css): the crumbs, the header with its "Nouveau sujet" button, then
 * the section's threads.
 */

const TOPIC_TITLES = ["58%", "44%", "66%", "52%", "38%", "62%", "47%", "55%"] as const;

export default function ForumCategoryLoading(): React.ReactElement {
  return (
    // .fo-page is a flex item with auto margins: the real page reaches its
    // max-width through its text, which bars do not have, hence the width.
    <div
      className="fo-page"
      style={{ width: "100%" }}
      aria-busy="true"
      aria-label="Chargement de la section du forum"
    >
      <CrumbsSkeleton steps={[38, 98]} />
      <ForumHeaderSkeleton eyebrow={86} title="6em" ledeLines={1} ledeLast="84%" action={124} />
      <ul className="fo-list" aria-hidden="true">
        {TOPIC_TITLES.map((title, i) => (
          <TopicRowSkeleton key={i} title={title} />
        ))}
      </ul>
    </div>
  );
}

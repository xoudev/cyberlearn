import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CrumbsSkeleton,
  FieldSkeleton,
  ForumHeaderSkeleton,
} from "../../_components/forum-skeleton";
import "../../forum.css";

/**
 * The new-thread form while it loads, drawn on the page's own classes
 * (forum.css): the crumbs, the header, then TopicComposer's two fields and its
 * button. No width is forced on .fo-page: the real one is as wide as the title
 * field and its hint, and FieldSkeleton measures the same.
 */
export default function NewTopicLoading(): React.ReactElement {
  return (
    <div className="fo-page" aria-busy="true" aria-label="Chargement du nouveau sujet">
      <CrumbsSkeleton steps={[38, 98, 98]} />
      <ForumHeaderSkeleton eyebrow={126} title="6.8em" ledeLines={1} ledeLast="70%" />

      <div className="fo-form" aria-hidden="true">
        <FieldSkeleton label={38} control={44} minControl={188} hint={554} />
        <FieldSkeleton label={54} control={180} minControl={203} multiline hint={422} />
        <div style={{ display: "flex", gap: 10 }}>
          <Skeleton w={146} h={34} />
        </div>
      </div>
    </div>
  );
}

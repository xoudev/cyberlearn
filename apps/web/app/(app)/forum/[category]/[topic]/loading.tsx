import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
  CrumbsSkeleton,
  FieldSkeleton,
  ForumHeaderSkeleton,
} from "../../_components/forum-skeleton";
import "../../forum.css";

/**
 * A thread while it loads, drawn on the page's own classes (forum.css): the
 * crumbs, the header, three messages with their author's column, then the
 * reply box.
 */

const POSTS = [
  { lines: 4, last: "46%" },
  { lines: 2, last: "70%" },
  { lines: 3, last: "38%" },
] as const;

/** PostCard: the avatar, name and level beside the date and the message. */
function PostSkeleton({ lines, last }: { lines: number; last: string }): React.ReactElement {
  return (
    <div className="fo-post">
      <div className="fo-post-author">
        {/* The avatar is a circle, so is its bar; the frame keeps its size,
            46px or 32px on a phone. */}
        <span className="fo-post-monogram">
          <Skeleton radius="circle" w="100%" h="100%" />
        </span>
        <Skeleton w={84} h={12} style={{ margin: "4px 0" }} />
        <Skeleton w={56} h={10} style={{ margin: "1.5px 0" }} />
      </div>
      <div className="fo-post-body">
        <div className="fo-post-head">
          <Skeleton w={150} h={10} style={{ margin: "2px 0" }} />
        </div>
        <SkeletonText
          lines={lines}
          lastWidth={last}
          lineHeight={14}
          gap={10}
          style={{ paddingBlock: 5 }}
        />
      </div>
    </div>
  );
}

export default function ForumTopicLoading(): React.ReactElement {
  return (
    // .fo-page is a flex item with auto margins: the real page reaches its
    // max-width through its text, which bars do not have, hence the width.
    <div
      className="fo-page"
      style={{ width: "100%" }}
      aria-busy="true"
      aria-label="Chargement du sujet"
    >
      <CrumbsSkeleton steps={[38, 98, 220]} />
      <ForumHeaderSkeleton eyebrow={340} title="72%" />

      <div aria-hidden="true">
        {POSTS.map((post, i) => (
          <PostSkeleton key={i} lines={post.lines} last={post.last} />
        ))}
      </div>

      {/* ReplyBox: its label, the textarea at its 140px, the hint, the button. */}
      <div className="fo-form" style={{ marginTop: 24 }} aria-hidden="true">
        <FieldSkeleton label={62} control={140} minControl={203} multiline hint={508} />
        <div>
          <Skeleton w={84} h={34} />
        </div>
      </div>
    </div>
  );
}

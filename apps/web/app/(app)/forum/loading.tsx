import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TopicRowSkeleton } from "./_components/forum-skeleton";
import "./community-forum.css";
import "./forum-home.css";

export default function ForumLoading(): React.ReactElement {
  return (
    <div
      className="fo-page fo-home learning-catalogue learning-workspace community-workspace"
      aria-busy="true"
      aria-label="Chargement du forum"
    >
      <div className="forum-home-head" aria-hidden="true">
        <div>
          <div className="forum-home-kicker">
            <Skeleton w={220} h={12} />
          </div>
          <Skeleton w="min(80vw, 300px)" h={64} />
          <div className="forum-home-intro">
            <Skeleton w="min(75vw, 380px)" h={14} />
          </div>
        </div>
        <Skeleton w={174} h={48} />
      </div>
      <div className="forum-home-ledger" aria-hidden="true">
        <Skeleton w={76} h={28} />
        <Skeleton w={76} h={28} />
      </div>
      <div className="forum-home-board" aria-hidden="true">
        <div className="forum-home-feed">
          <div className="forum-home-section-head">
            <Skeleton w={180} h={28} />
          </div>
          <ul className="fo-list forum-home-topics">
            <TopicRowSkeleton title="70%" />
            <TopicRowSkeleton title="55%" />
          </ul>
        </div>
        <div className="forum-home-directory">
          <div className="forum-home-section-head">
            <Skeleton w={150} h={28} />
          </div>
          <ol>
            {[0, 1, 2, 3, 4].map((index) => (
              <li key={index}>
                <div style={{ minHeight: 78, padding: 16 }}>
                  <Skeleton w="75%" h={24} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

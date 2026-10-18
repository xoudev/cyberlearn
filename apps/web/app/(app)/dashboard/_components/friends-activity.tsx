import React from "react";
import Link from "next/link";
import {
  FRIEND_ACTIVITY_EMPTY,
  FRIEND_ACTIVITY_TITLE,
  friendActivityText,
  isFriendsLatest,
  type FriendActivityItem,
} from "@cyberlearn/lib/social/friend-activity";
import { CHALLENGE_LABEL, DUEL_OPEN_LABEL } from "@cyberlearn/lib/social/friendship";
import { notificationAge } from "@cyberlearn/lib/social/notification-age";
import { ChallengeButton } from "@/app/(app)/duels/_components/challenge-button";
import { AvatarView } from "@/components/avatar-view";

/**
 * "Tes amis": what the reader's friends did lately, one line each (who, what,
 * when), read on the server (lib/friends/friends-activity.ts). The friend's
 * most recent line carries "Défier", which opens the "Défier" window with
 * them picked, or says a duel between the two is still open. Friends who have
 * been quiet leave a sentence and a duel to send. Drawn only for a reader
 * with a friend: the page leaves it out otherwise.
 */
export function FriendsActivity({
  items,
  now,
}: {
  items: FriendActivityItem[];
  /** The page's clock, for "il y a 3 h". */
  now: number;
}): React.JSX.Element {
  return (
    <section className="dash-sec" aria-labelledby="dash-friends-title">
      <div className="dash-sec-head">
        <h2 id="dash-friends-title">{FRIEND_ACTIVITY_TITLE}</h2>
        <Link href="/duels" className="dash-sec-link">
          Tes duels
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="dash-friends-empty">
          <p>{FRIEND_ACTIVITY_EMPTY}</p>
          <ChallengeButton className="btn btn--ghost btn--sm">
            Défier un ami <span aria-hidden="true">→</span>
          </ChallengeButton>
        </div>
      ) : (
        <ul className="dash-friends">
          {items.map((item, i) => {
            const { friend } = item;
            return (
              <li key={item.key} className="dash-friend">
                <AvatarView
                  src={friend.avatarSrc}
                  name={friend.name}
                  className="dash-friend-avatar"
                  glyphSize={16}
                />
                <p className="dash-friend-text">
                  {friend.profileOpen && friend.username !== null ? (
                    <Link href={`/u/${friend.username}`} className="dash-friend-name">
                      {friend.name}
                    </Link>
                  ) : (
                    <b className="dash-friend-name">{friend.name}</b>
                  )}{" "}
                  {friendActivityText(item.kind, item.title)}
                  <time className="dash-friend-when" dateTime={item.at}>
                    {notificationAge(item.at, now)}
                  </time>
                </p>
                {/* Once per friend, on their most recent line. */}
                {isFriendsLatest(items, i) &&
                  (friend.duelOpen ? (
                    <span className="dash-friend-busy" title={DUEL_OPEN_LABEL}>
                      {DUEL_OPEN_LABEL}
                      <span className="sr-only"> avec {friend.name}</span>
                    </span>
                  ) : (
                    <ChallengeButton friendId={friend.id} className="btn btn--ghost btn--sm">
                      {CHALLENGE_LABEL}
                      <span className="sr-only"> {friend.name} en duel</span>
                    </ChallengeButton>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

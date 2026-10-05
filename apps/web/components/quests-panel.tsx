import React from "react";
import { isoWeekKey } from "@cyberlearn/lib";
import { questRepository } from "@cyberlearn/db";
import type { QuestWithProgress } from "@cyberlearn/db";
import {
  QUEST_COPY,
  splitWeekQuests,
  weekCompletion,
} from "@cyberlearn/lib/gamification/weekly-quests";
import { ClaimQuestButton } from "./claim-quest-button";
import { ProgressBar } from "@/components/progress-bar";

function Check(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 6.5l2.5 2.5 4.5-5" />
    </svg>
  );
}

function QuestRow({ q }: { q: QuestWithProgress }): React.ReactElement {
  const state = q.claimed ? "claimed" : q.completed ? "done" : "open";
  return (
    <li className={`dash-quest dash-quest--${state}`}>
      <span className="dash-chk" aria-hidden="true">
        {q.completed && <Check />}
      </span>
      <span className="dash-quest-title">
        {q.title}
        <span className="sr-only">
          {q.claimed
            ? ", réclamée"
            : q.completed
              ? ", faite"
              : `, ${String(q.progress)} sur ${String(q.target)}`}
        </span>
      </span>
      {q.claimed ? (
        <span className="dash-quest-right dash-quest-claimed">réclamé</span>
      ) : q.completed ? (
        <ClaimQuestButton questId={q.id} xpReward={q.xpReward} />
      ) : (
        <span className="dash-quest-right dash-num">
          <b>{q.progress}</b>/{q.target}
        </span>
      )}
    </li>
  );
}

/**
 * The week's quests as a list to tick: each one done gets its claim button,
 * each one claimed steps back, the ones open show how far along they are.
 * Server component - reads questRepository.findWeek(). The split, the week's
 * completion and the words are the app's too (gamification/weekly-quests).
 */
export async function QuestsPanel({
  userId,
}: {
  userId: string;
}): Promise<React.ReactElement | null> {
  const quests = await questRepository.findWeek(userId, isoWeekKey(new Date()));
  if (quests.length === 0) return null;

  const { main, bonus } = splitWeekQuests(quests);
  if (main.length === 0) return null;

  const { claimedCount, totalXp, claimedXp } = weekCompletion(main);

  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <h3>Quêtes</h3>
        <span className="dash-num">
          {claimedCount} / {main.length}
        </span>
      </div>
      <ProgressBar
        value={claimedCount}
        max={main.length}
        label={QUEST_COPY.completion}
        className="dash-qbar"
      />
      <ul className="dash-quest-list">
        {main.map((q) => (
          <QuestRow key={q.id} q={q} />
        ))}
      </ul>
      {bonus && (
        <div className="dash-bonus">
          <span className="dash-bonus-title">{QUEST_COPY.bonusTitle(main.length)}</span>
          <span>
            <b>{QUEST_COPY.reward(bonus.xpReward)}</b>
            {QUEST_COPY.bonusFreeze(bonus.freezeReward)} ·{" "}
            {QUEST_COPY.claimedXp(claimedXp, totalXp)}
          </span>
          {bonus.claimed ? (
            <span className="dash-quest-claimed">{QUEST_COPY.claimed}</span>
          ) : bonus.completed ? (
            <ClaimQuestButton questId={bonus.id} xpReward={bonus.xpReward} />
          ) : null}
        </div>
      )}
    </div>
  );
}

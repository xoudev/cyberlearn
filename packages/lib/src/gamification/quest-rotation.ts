import { seededRandom } from "../quiz/option-order.js";

/**
 * Which of the quest pool the week asks for.
 *
 * The four quests used to be the same every week: after a month nothing in
 * them was new. The pool now holds several quests per kind, each at a level
 * (1: a short one, 2: a longer one), and every week draws four of them, the
 * same for everyone: a lesson quest always (lessons are what the site is
 * for), then two short quests and a long one, never two of the same kind.
 *
 * The draw is a pure function of the pool and the week's key, so it comes out
 * the same wherever it is made. The server stores it on the week's first read
 * (questRepository.ensureWeek), which keeps the week's quests in place if the
 * pool changes before the week is out.
 */

/** What the draw needs to know of a quest. */
export interface RotationQuest {
  id: string;
  /** Stable code; sorts the pool so the draw does not depend on query order. */
  code: string;
  type: string;
  /** 1 for a short quest, 2 for a longer one. */
  level: number;
}

/** The kind of quest every week asks for. */
export const LESSON_QUEST_TYPE = "LESSON_COMPLETED";
/** The completion bonus: not drawn, it comes with every week. */
export const BONUS_QUEST_TYPE = "WEEKLY_BONUS";
/** How many quests a week asks for, the bonus aside. */
export const WEEK_QUEST_COUNT = 4;

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = out[i];
    const other = out[j];
    if (tmp === undefined || other === undefined) continue;
    out[i] = other;
    out[j] = tmp;
  }
  return out;
}

/**
 * The draw: a lesson quest, two short quests and a long one, all of different
 * kinds. Each slot takes a quest of last week's (`avoid`) only when no other
 * fits it, so two weeks running share nothing when the pool allows it.
 */
function draw<Q extends RotationQuest>(
  lessons: readonly Q[],
  others: readonly Q[],
  seed: string,
  avoid: ReadonlySet<string>,
): Q[] {
  const random = seededRandom(seed);
  const fresh = (quest: Q): boolean => !avoid.has(quest.id);
  const picked: Q[] = [];
  const lessonOrder = shuffled(lessons, random);
  const lesson = lessonOrder.find(fresh) ?? lessonOrder[0];
  if (lesson) picked.push(lesson);

  const pool = shuffled(others, random);
  const kinds = new Set(picked.map((quest) => quest.type));
  const take = (accept: (quest: Q) => boolean): boolean => {
    const fits = (q: Q): boolean => !picked.includes(q) && !kinds.has(q.type) && accept(q);
    const quest = pool.find((q) => fits(q) && fresh(q)) ?? pool.find(fits);
    if (!quest) return false;
    picked.push(quest);
    kinds.add(quest.type);
    return true;
  };
  // The wanted mix, then whatever kind is left when the pool lacks a level.
  take((quest) => quest.level <= 1);
  take((quest) => quest.level <= 1);
  take((quest) => quest.level >= 2);
  while (picked.length < WEEK_QUEST_COUNT && take(() => true));
  return picked;
}

/**
 * The week's quests, in the order they are shown (the lesson quest first).
 * `avoid` are the quests of the week before, left out wherever the pool has
 * something else to offer. The same pool, week and `avoid` always give the
 * same draw. Inactive rows are the caller's to leave out; the bonus is never
 * returned (it comes with every week).
 */
export function pickWeekQuests<Q extends RotationQuest>(
  pool: readonly Q[],
  weekKey: string,
  avoid: ReadonlySet<string> = new Set(),
): Q[] {
  const sorted = [...pool].sort((a, b) => a.code.localeCompare(b.code));
  const lessons = sorted.filter((quest) => quest.type === LESSON_QUEST_TYPE);
  const others = sorted.filter(
    (quest) => quest.type !== LESSON_QUEST_TYPE && quest.type !== BONUS_QUEST_TYPE,
  );
  return draw(lessons, others, `quests:${weekKey}`, avoid);
}

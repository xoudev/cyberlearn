import type {
  IncidentStory,
  StoryChoice,
  StoryEnding,
  StoryScene,
  StoryVerdict,
} from "@cyberlearn/types";

/**
 * Playing an <IncidentStory>: the learner's picks, one index per decision,
 * replayed from the first scene. The state is the picks alone, so the site
 * and the app each hold a list of numbers and derive the rest from it the
 * same way: the scene to show, the steps taken and what each one did, the
 * ending reached, the count of good, risky and bad decisions, and the run the
 * story recommends, for the debrief.
 */

export interface StoryStep {
  scene: StoryScene;
  choice: StoryChoice;
  /** The index of the choice among the scene's. */
  pick: number;
}

export interface Playthrough {
  steps: StoryStep[];
  /** The scene to show now: the next decision, or the ending reached. */
  scene: StoryScene;
  /** Set once `scene` is an ending. */
  ending: StoryEnding | null;
}

/** The words the site and the app put on a decision taken. */
export const VERDICT_LABELS: Record<StoryVerdict, string> = {
  good: "Bonne décision",
  risky: "Décision risquée",
  bad: "Mauvaise décision",
};

/** The words on an ending reached. */
export const ENDING_LABELS: Record<StoryEnding, string> = {
  success: "Incident maîtrisé",
  partial: "Dégâts limités",
  failure: "Incident aggravé",
};

const ENDING_SENTENCES: Record<StoryEnding, string> = {
  success: "Incident maîtrisé.",
  partial: "Service rétabli, mais pas tout réglé.",
  failure: "L'incident a mal tourné.",
};

export function sceneOf(story: IncidentStory, id: string): StoryScene | undefined {
  return story.scenes.find((scene) => scene.id === id);
}

/** The beginning: the story's first scene. */
export function firstScene(story: IncidentStory): StoryScene {
  const first = story.scenes[0];
  if (first === undefined) throw new Error("a story needs a scene to begin with");
  return first;
}

/**
 * The picks replayed from the first scene. A pick that is not one of the
 * scene's choices, or any pick after an ending, is ignored with the rest:
 * the story shows where it stands.
 */
export function play(story: IncidentStory, picks: readonly number[]): Playthrough {
  let scene = firstScene(story);
  const steps: StoryStep[] = [];
  for (const pick of picks) {
    const choice = scene.choices?.[pick];
    if (choice === undefined) break;
    const next = sceneOf(story, choice.next);
    if (next === undefined) break;
    steps.push({ scene, choice, pick });
    scene = next;
  }
  return { steps, scene, ending: scene.ending ?? null };
}

export type Tally = Record<StoryVerdict, number>;

export function tally(steps: readonly StoryStep[]): Tally {
  const counts: Tally = { good: 0, risky: 0, bad: 0 };
  for (const step of steps) counts[step.choice.verdict] += 1;
  return counts;
}

/** The scenes the story can end on, in the order they are written. */
export function endingsOf(story: IncidentStory): StoryScene[] {
  return story.scenes.filter((scene) => scene.ending !== undefined);
}

/**
 * The run the story recommends: from the first scene, good choices only,
 * down to a success ending; the first such run in the order the choices are
 * written, or null when good decisions alone do not reach a success.
 */
export function recommendedPath(story: IncidentStory): StoryStep[] | null {
  const seen = new Set<string>();
  const walk = (scene: StoryScene): StoryStep[] | null => {
    if (scene.ending === "success") return [];
    if (seen.has(scene.id)) return null;
    seen.add(scene.id);
    for (const [pick, choice] of (scene.choices ?? []).entries()) {
      if (choice.verdict !== "good") continue;
      const next = sceneOf(story, choice.next);
      if (next === undefined) continue;
      const rest = walk(next);
      if (rest !== null) return [{ scene, choice, pick }, ...rest];
    }
    seen.delete(scene.id);
    return null;
  };
  return walk(firstScene(story));
}

function count(n: number, one: string, many: string): string {
  return `${String(n)} ${n > 1 ? many : one}`;
}

/** "4 bonnes décisions, 1 risquée, 0 mauvaise." */
export function tallyLine(counts: Tally): string {
  return `${count(counts.good, "bonne décision", "bonnes décisions")}, ${count(counts.risky, "risquée", "risquées")}, ${count(counts.bad, "mauvaise", "mauvaises")}.`;
}

/** The debrief's first line: how it ended, then the count of decisions. */
export function debriefLine(run: Playthrough): string {
  const head = run.ending === null ? "L'histoire n'est pas finie." : ENDING_SENTENCES[run.ending];
  return `${head} ${tallyLine(tally(run.steps))}`;
}

/** A scene's text as paragraphs: blank lines separate them. */
export function paragraphsOf(text: string): string[] {
  return text
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

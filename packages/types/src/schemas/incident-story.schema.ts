import { z } from "zod";

/**
 * <IncidentStory>: an incident told scene by scene, where the learner decides
 * at each step and lives with the consequence. A scene is a situation and two
 * to four choices, or an ending; every choice leads to another scene, says
 * how the story judges it (good, risky, bad) and what follows from it. The
 * first scene is the beginning. The story is a tree or a lattice, never a
 * loop, so it always ends. The site and the app read the same props through
 * parseIncidentStory, and play them with @cyberlearn/lib/story/incident.
 */

const sceneId = z.string().trim().min(1).max(60);

export const STORY_VERDICTS = ["good", "risky", "bad"] as const;
export type StoryVerdict = (typeof STORY_VERDICTS)[number];

export const STORY_ENDINGS = ["success", "partial", "failure"] as const;
export type StoryEnding = (typeof STORY_ENDINGS)[number];

export const storyChoiceSchema = z
  .object({
    /** The decision, as the learner reads it on the button. */
    text: z.string().trim().min(1).max(200),
    /** The id of the scene it leads to. */
    next: sceneId,
    /** How the story judges it: the colour of the feedback, and the debrief's count. */
    verdict: z.enum(STORY_VERDICTS),
    /** What follows from it, shown as soon as it is taken, and again in the debrief. */
    consequence: z.string().trim().min(1).max(600),
  })
  .strict();

export type StoryChoice = z.infer<typeof storyChoiceSchema>;

export const storySceneSchema = z
  .object({
    id: sceneId,
    /** "3 h 12, l'alerte" */
    title: z.string().trim().min(1).max(120).optional(),
    /** The situation; a blank line separates paragraphs. */
    text: z.string().trim().min(1).max(2000),
    choices: z.array(storyChoiceSchema).min(2).max(4).optional(),
    /** On a last scene: how the story ends there. */
    ending: z.enum(STORY_ENDINGS).optional(),
  })
  .strict()
  .superRefine((scene, ctx) => {
    if ((scene.choices === undefined) === (scene.ending === undefined)) {
      ctx.addIssue({
        code: "custom",
        message: `la scène « ${scene.id} » demande des choix (choices) ou une fin (ending) : pas les deux, pas aucun.`,
      });
    }
  });

export type StoryScene = z.infer<typeof storySceneSchema>;

export const incidentStorySchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    /** Who the learner is in the story: "Tu es l'analyste d'astreinte." */
    role: z.string().trim().min(1).max(300).optional(),
    /** What to do, over the story; the scenes usually say it. */
    task: z.string().trim().min(1).max(600).optional(),
    /** The first scene is the beginning. */
    scenes: z.array(storySceneSchema).min(2).max(40),
  })
  .strict()
  .superRefine((story, ctx) => {
    const problem = (message: string): void => {
      ctx.addIssue({ code: "custom", path: ["scenes"], message });
    };
    const scenes = new Map<string, StoryScene>();
    for (const scene of story.scenes) {
      if (scenes.has(scene.id)) problem(`deux scènes portent l'id « ${scene.id} ».`);
      scenes.set(scene.id, scene);
    }
    for (const scene of story.scenes) {
      for (const choice of scene.choices ?? []) {
        if (!scenes.has(choice.next)) {
          problem(
            `le choix « ${choice.text} » de la scène « ${scene.id} » mène à « ${choice.next} », qui n'existe pas.`,
          );
        } else if (choice.next === scene.id) {
          problem(
            `le choix « ${choice.text} » de la scène « ${scene.id} » mène à sa propre scène.`,
          );
        }
      }
    }
    if (!story.scenes.some((scene) => scene.ending !== undefined)) {
      problem("il faut au moins une scène de fin (ending), sinon l'histoire ne finit pas.");
    }

    // Reachability and loops, from the first scene, with the ids that exist.
    const first = story.scenes[0];
    if (first === undefined) return;
    const visited = new Set<string>();
    const stack = [first.id];
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === undefined || visited.has(id)) continue;
      visited.add(id);
      for (const choice of scenes.get(id)?.choices ?? []) {
        if (scenes.has(choice.next)) stack.push(choice.next);
      }
    }
    const unreached = story.scenes.filter((scene) => !visited.has(scene.id));
    if (unreached.length > 0) {
      const names = unreached.map((scene) => `« ${scene.id} »`).join(", ");
      problem(
        unreached.length === 1
          ? `la scène ${names} n'est atteinte par aucun choix.`
          : `les scènes ${names} ne sont atteintes par aucun choix.`,
      );
    }
    const loop = findLoop(scenes, first.id);
    if (loop !== null) {
      problem(
        `les scènes ${loop.map((id) => `« ${id} »`).join(", ")} forment une boucle : une histoire doit finir.`,
      );
    }
  });

export type IncidentStory = z.infer<typeof incidentStorySchema>;

/**
 * The first loop a walk from `start` runs into, as the ids from the scene the
 * walk re-enters back to itself; null when every path ends.
 */
function findLoop(scenes: ReadonlyMap<string, StoryScene>, start: string): string[] | null {
  const done = new Set<string>();
  const path: string[] = [];
  const onPath = new Set<string>();
  const walk = (id: string): string[] | null => {
    if (onPath.has(id)) return [...path.slice(path.indexOf(id)), id];
    if (done.has(id)) return null;
    onPath.add(id);
    path.push(id);
    for (const choice of scenes.get(id)?.choices ?? []) {
      if (!scenes.has(choice.next)) continue;
      const found = walk(choice.next);
      if (found !== null) return found;
    }
    path.pop();
    onPath.delete(id);
    done.add(id);
    return null;
  };
  return walk(start);
}

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

/** Reads the props, or says in French what is wrong, for the lesson's author. */
export function parseIncidentStory(raw: unknown): Parsed<IncidentStory> {
  const parsed = incidentStorySchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length && issue.code !== "custom" ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}

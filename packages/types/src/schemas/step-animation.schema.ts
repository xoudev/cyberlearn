import { z } from "zod";

/**
 * <StepAnimation>: an animation the learner steps through, scene by scene
 * (the TCP handshake, symmetric encryption, the call stack). The scenes are
 * drawn by the site (Remotion); their steps and texts live in
 * @cyberlearn/lib/animations, where the app reads them too. The site, the app
 * and the lesson check read the props through this schema.
 */

export const ANIMATION_SCENE_IDS = ["tcp-handshake", "symmetric-encryption", "call-stack"] as const;

export type AnimationSceneId = (typeof ANIMATION_SCENE_IDS)[number];

export const stepAnimationSchema = z.object({
  id: z.string().min(1).max(80),
  scene: z.enum(ANIMATION_SCENE_IDS),
  /** Shown in the header instead of the scene's own title. */
  title: z.string().trim().min(1).max(120).optional(),
  /** A sentence under the animation, for what the lesson wants noticed. */
  caption: z.string().trim().min(1).max(300).optional(),
});

export type StepAnimation = z.infer<typeof stepAnimationSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

export function parseStepAnimation(raw: unknown): Parsed<StepAnimation> {
  const parsed = stepAnimationSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}

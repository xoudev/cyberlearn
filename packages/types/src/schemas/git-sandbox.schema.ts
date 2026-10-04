import { z } from "zod";

/**
 * <GitSandbox>: a Git repository simulated in the page (and in the app), with
 * a shell that knows a few file commands and the git commands of the lessons.
 * The branch graph is drawn as the learner types. The engine lives in
 * @cyberlearn/lib/git; the site, the app and the lesson check read the props
 * through this schema.
 */

const branchName = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]{0,59}$/u, "Nom de branche invalide.");
const filePath = z
  .string()
  .regex(/^[A-Za-z0-9._-][A-Za-z0-9._/-]{0,79}$/u, "Chemin de fichier invalide.");

/**
 * What the learner must leave behind, checked after each command:
 *
 * - `branch` / `no-branch`: the branch exists, or existed and no longer does
 *   (a branch never made does not tick `no-branch`);
 * - `on-branch`: HEAD is on the branch;
 * - `commit`: a commit with this message is in the branch's history;
 * - `commits`: the branch's history counts at least `min` commits;
 * - `file`: the file, as committed on the branch (or in the working tree
 *   without a branch), exists, holds `contains` and not `lacks` if given
 *   (`lacks: "<<<<<<<"`: no conflict marker left behind);
 * - `merge-commit`: the branch's history has a merge commit;
 * - `linear`: the branch's history has none (after a rebase);
 * - `clean`: nothing staged, nothing modified, no merge in progress.
 */
export const gitCheckSchema = z.discriminatedUnion("expect", [
  z.object({
    label: z.string().min(1).max(200),
    expect: z.enum(["branch", "no-branch", "on-branch"]),
    branch: branchName,
  }),
  z.object({
    label: z.string().min(1).max(200),
    expect: z.literal("commit"),
    branch: branchName,
    message: z.string().min(1).max(200),
  }),
  z.object({
    label: z.string().min(1).max(200),
    expect: z.literal("commits"),
    branch: branchName,
    min: z.number().int().min(1).max(100),
  }),
  z.object({
    label: z.string().min(1).max(200),
    expect: z.literal("file"),
    branch: branchName.optional(),
    path: filePath,
    contains: z.string().min(1).max(500).optional(),
    lacks: z.string().min(1).max(200).optional(),
  }),
  z.object({
    label: z.string().min(1).max(200),
    expect: z.enum(["merge-commit", "linear"]),
    branch: branchName,
  }),
  z.object({
    label: z.string().min(1).max(200),
    expect: z.literal("clean"),
  }),
]);

export type GitCheck = z.infer<typeof gitCheckSchema>;

export const gitSandboxSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(120).optional(),
  /**
   * Commands run before the learner starts, without showing their output:
   * the repository the exercise begins from. Each must succeed.
   */
  setup: z.array(z.string().min(1).max(300)).max(60).optional(),
  /** What to do, above the terminal. */
  task: z.string().trim().min(1).max(800).optional(),
  checks: z.array(gitCheckSchema).max(20).optional(),
  hints: z.array(z.string().trim().min(1).max(400)).max(10).optional(),
});

export type GitSandbox = z.infer<typeof gitSandboxSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

export function parseGitSandbox(raw: unknown): Parsed<GitSandbox> {
  const parsed = gitSandboxSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}

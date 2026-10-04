import type { GitCheck } from "@cyberlearn/types";
import { type GitState, history, isClean } from "./sandbox";

/**
 * Whether a <GitSandbox> check holds on a state: the site and the app tick
 * the same boxes after each command.
 */
export function checkHolds(state: GitState, check: GitCheck): boolean {
  if (check.expect === "clean") return state.initialized && isClean(state);
  if (check.expect === "file") {
    const tip = check.branch === undefined ? undefined : state.branches.get(check.branch);
    const content =
      check.branch === undefined
        ? state.worktree.get(check.path)
        : tip === undefined
          ? undefined
          : state.commits.get(tip)?.tree.get(check.path);
    return (
      content !== undefined &&
      (check.contains === undefined || content.includes(check.contains)) &&
      (check.lacks === undefined || !content.includes(check.lacks))
    );
  }
  const tip = state.branches.get(check.branch);
  switch (check.expect) {
    case "branch":
      return tip !== undefined;
    case "no-branch":
      return state.known.has(check.branch) && tip === undefined;
    case "on-branch":
      return state.initialized && state.head === check.branch;
    case "commit":
      return (
        tip !== undefined &&
        history(state, tip).some(
          (c) => (c.message.split("\n")[0] ?? "").trim() === check.message.trim(),
        )
      );
    case "commits":
      return tip !== undefined && history(state, tip).length >= check.min;
    case "merge-commit":
      return tip !== undefined && history(state, tip).some((c) => c.parents.length > 1);
    case "linear":
      return tip !== undefined && history(state, tip).every((c) => c.parents.length <= 1);
  }
}

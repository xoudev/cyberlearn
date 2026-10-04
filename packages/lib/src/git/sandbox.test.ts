import { describe, expect, it } from "vitest";
import { checkHolds } from "./checks";
import { layoutGraph } from "./graph";
import {
  EMPTY_STATE,
  type GitState,
  headCommit,
  promptOf,
  resolveRef,
  run,
  runSetup,
  tokenize,
} from "./sandbox";

/** Plays commands that must all succeed, and returns the state they leave. */
function play(lines: string[], from: GitState = EMPTY_STATE): GitState {
  let state = from;
  for (const line of lines) {
    const result = run(state, line);
    if (!result.ok) throw new Error(`${line} -> ${result.output}`);
    state = result.state;
  }
  return state;
}

const FIRST_COMMIT = [
  "git init",
  'echo "# Projet" > README.md',
  "git add README.md",
  'git commit -m "Premier commit"',
];

describe("the command line", () => {
  it("reads quotes, redirections and && as a shell does", () => {
    expect(tokenize(`echo "deux  mots" >>notes.txt && git add .`)).toEqual([
      { text: "echo", op: false },
      { text: "deux  mots", op: false },
      { text: ">>", op: true },
      { text: "notes.txt", op: false },
      { text: "&&", op: true },
      { text: "git", op: false },
      { text: "add", op: false },
      { text: ".", op: false },
    ]);
    expect(tokenize(`git commit -m "oubli`)).toBeNull();
    expect(run(EMPTY_STATE, `echo "oubli`).output).toBe("Guillemet non fermé.");
  });

  it("stops a && chain at the first failure, keeping what came before", () => {
    const state = play(["git init", 'echo "a" > a.txt']);
    const result = run(state, "git add . && git commit");
    expect(result.ok).toBe(false);
    expect(result.output).toContain("n'ouvre pas d'éditeur");
    expect(result.state.index.get("a.txt")).toBe("a\n");
  });

  it("keeps a file named after an Object method as any other file", () => {
    const state = play(["git init", 'echo "x" > constructor', "git add constructor"]);
    expect(run(state, "cat constructor").output).toBe("x");
    expect(run(play(["git init"]), "cat toString").output).toContain("No such file");
  });
});

describe("the first commits", () => {
  it("is not a repository before git init", () => {
    expect(run(EMPTY_STATE, "git status")).toMatchObject({
      ok: false,
      output: "fatal: not a git repository (or any of the parent directories): .git",
    });
    expect(run(EMPTY_STATE, "git init").output).toBe(
      "Initialized empty Git repository in /home/toi/projet/.git/",
    );
  });

  it("walks a file from untracked to staged to committed, as git status says", () => {
    const state = play(["git init", 'echo "# Projet" > README.md']);
    expect(run(state, "git status").output).toBe(
      [
        "On branch main",
        "",
        "No commits yet",
        "",
        "Untracked files:",
        '  (use "git add <file>..." to include in what will be committed)',
        "\tREADME.md",
        "",
        'nothing added to commit but untracked files present (use "git add" to track)',
      ].join("\n"),
    );
    const staged = play(["git add README.md"], state);
    expect(run(staged, "git status").output).toContain("\tnew file:   README.md");
    const result = run(staged, 'git commit -m "Premier commit"');
    expect(result.output).toMatch(
      /^\[main \(root-commit\) [0-9a-f]{7}\] Premier commit\n 1 file changed$/u,
    );
    expect(run(result.state, "git status").output).toBe(
      "On branch main\nnothing to commit, working tree clean",
    );
  });

  it("refuses a commit with nothing staged, and leaves everything as it was", () => {
    const state = play([...FIRST_COMMIT, 'echo "suite" >> README.md']);
    const result = run(state, 'git commit -m "Rien"');
    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.output).toContain("\tmodified:   README.md");
    expect(result.output).toContain(
      'no changes added to commit (use "git add" and/or "git commit -a")',
    );
    expect(run(state, 'git commit -am "Suite"').ok).toBe(true);
  });

  it("names a commit by what it holds, the same on every device", () => {
    const a = play(FIRST_COMMIT);
    const b = play(FIRST_COMMIT);
    expect(headCommit(a)?.id).toBe(headCommit(b)?.id);
  });

  it("shows the change in git diff, and the staged one with --staged", () => {
    const state = play([...FIRST_COMMIT, 'echo "Une ligne" >> README.md']);
    expect(run(state, "git diff").output).toBe(
      [
        "diff --git a/README.md b/README.md",
        "--- a/README.md",
        "+++ b/README.md",
        "@@ -1,1 +1,2 @@",
        " # Projet",
        "+Une ligne",
      ].join("\n"),
    );
    expect(run(state, "git diff --staged").output).toBe("");
    expect(run(play(["git add ."], state), "git diff --staged").output).toContain("+Une ligne");
  });

  it("logs the history with HEAD and the branches", () => {
    const state = play([
      ...FIRST_COMMIT,
      "git branch dev",
      'echo "b" > b.txt',
      "git add .",
      'git commit -m "Ajoute b"',
    ]);
    const [top, bottom] = run(state, "git log --oneline").output.split("\n");
    expect(top).toMatch(/^[0-9a-f]{7} \(HEAD -> main\) Ajoute b$/u);
    expect(bottom).toMatch(/^[0-9a-f]{7} \(dev\) Premier commit$/u);
  });
});

describe("branches", () => {
  it("creates, lists and switches, the files following the branch", () => {
    const state = play([
      ...FIRST_COMMIT,
      "git switch -c feature/login",
      'echo "login" > login.txt',
      "git add .",
      'git commit -m "Page de connexion"',
    ]);
    expect(run(state, "git branch").output).toBe("* feature/login\n  main");
    const onMain = play(["git switch main"], state);
    expect(onMain.worktree.has("login.txt")).toBe(false);
    expect(promptOf(onMain)).toBe("toi@cyberlearn:~/projet (main)$");
    expect(run(state, "git checkout main").output).toBe("Switched to branch 'main'");
  });

  it("refuses to switch over a change it would lose, and carries one it would not", () => {
    const state = play([
      ...FIRST_COMMIT,
      "git switch -c doc",
      'echo "doc" >> README.md',
      'git commit -am "Doc"',
      "git switch main",
      'echo "local" >> README.md',
    ]);
    const refused = run(state, "git switch doc");
    expect(refused.ok).toBe(false);
    expect(refused.output).toContain(
      "error: Your local changes to the following files would be overwritten by checkout:\n\tREADME.md",
    );
    const carried = play(
      ["git restore README.md", 'echo "n" > notes.txt', "git switch doc"],
      state,
    );
    expect(carried.worktree.get("notes.txt")).toBe("n\n");
  });

  it("deletes a merged branch, and refuses an unmerged one without -D", () => {
    const state = play([
      ...FIRST_COMMIT,
      "git switch -c fix",
      'echo "x" > x.txt',
      "git add .",
      'git commit -m "Fix"',
      "git switch main",
    ]);
    expect(run(state, "git branch -d fix").output).toContain(
      "error: the branch 'fix' is not fully merged",
    );
    expect(run(state, "git branch -D fix").output).toMatch(
      /^Deleted branch fix \(was [0-9a-f]{7}\)\.$/u,
    );
    const merged = play(["git merge fix"], state);
    expect(run(merged, "git branch -d fix").ok).toBe(true);
    expect(run(merged, "git branch -d main").output).toContain("cannot delete branch 'main'");
  });

  it("refuses a detached HEAD, and says how to start a branch there instead", () => {
    const state = play([...FIRST_COMMIT, 'echo "2" >> README.md', 'git commit -am "Deux"']);
    const first = resolveRef(state, "HEAD~1");
    expect(first?.message).toBe("Premier commit");
    expect(run(state, `git checkout ${first?.id ?? ""}`).output).toContain(
      "git switch -c nom <commit>",
    );
    expect(play([`git switch -c ancien ${first?.id ?? ""}`], state).worktree.get("README.md")).toBe(
      "# Projet\n",
    );
  });
});

describe("merging", () => {
  const diverged = [
    ...FIRST_COMMIT,
    "git switch -c feature",
    'echo "f" > feature.txt',
    "git add .",
    'git commit -m "Feature"',
    "git switch main",
    'echo "m" > main.txt',
    "git add .",
    'git commit -m "Main"',
  ];

  it("fast-forwards when main has not moved", () => {
    const state = play([
      ...FIRST_COMMIT,
      "git switch -c f",
      'echo "f" > f.txt',
      "git add .",
      'git commit -m "F"',
      "git switch main",
    ]);
    const result = run(state, "git merge f");
    expect(result.output).toMatch(
      /^Updating [0-9a-f]{7}\.\.[0-9a-f]{7}\nFast-forward\n 1 file changed$/u,
    );
    expect(result.state.branches.get("main")).toBe(result.state.branches.get("f"));
  });

  it("makes a merge commit with two parents when both branches moved", () => {
    const result = run(play(diverged), "git merge feature");
    expect(result.output).toBe("Merge made by the 'ort' strategy.\n 1 file changed");
    const merge = headCommit(result.state);
    expect(merge?.parents).toHaveLength(2);
    expect(merge?.message).toBe("Merge branch 'feature'");
    expect([...result.state.worktree.keys()].sort()).toEqual([
      "README.md",
      "feature.txt",
      "main.txt",
    ]);
  });

  it("stops on a conflict with the markers, then concludes once it is resolved", () => {
    const state = play([
      ...FIRST_COMMIT,
      "git switch -c titre",
      'echo "# Mon projet" > README.md',
      'git commit -am "Titre"',
      "git switch main",
      'echo "# Le projet" > README.md',
      'git commit -am "Autre titre"',
    ]);
    const merged = run(state, "git merge titre");
    expect(merged.ok).toBe(false);
    expect(merged.output).toBe(
      [
        "Auto-merging README.md",
        "CONFLICT (content): Merge conflict in README.md",
        "Automatic merge failed; fix conflicts and then commit the result.",
      ].join("\n"),
    );
    const conflicted = merged.state;
    expect(conflicted.worktree.get("README.md")).toBe(
      "<<<<<<< HEAD\n# Le projet\n=======\n# Mon projet\n>>>>>>> titre\n",
    );
    expect(promptOf(conflicted)).toBe("toi@cyberlearn:~/projet (main|MERGING)$");
    expect(run(conflicted, "git status").output).toContain("\tboth modified:   README.md");
    expect(run(conflicted, 'git commit -m "Trop tôt"').output).toContain(
      "error: Committing is not possible because you have unmerged files.",
    );
    expect(run(conflicted, "git switch titre").ok).toBe(false);

    const resolved = play(
      ['echo "# Mon projet" > README.md', "git add README.md", "git commit"],
      conflicted,
    );
    expect(resolved.merging).toBeNull();
    expect(headCommit(resolved)?.parents).toHaveLength(2);
    expect(headCommit(resolved)?.message).toBe("Merge branch 'titre'");
    expect(run(resolved, "git status").output).toBe(
      "On branch main\nnothing to commit, working tree clean",
    );
  });

  it("puts everything back with git merge --abort", () => {
    const state = play([
      ...FIRST_COMMIT,
      "git switch -c a",
      'echo "A" > README.md',
      'git commit -am "A"',
      "git switch main",
      'echo "B" > README.md',
      'git commit -am "B"',
    ]);
    const conflicted = run(state, "git merge a").state;
    const aborted = play(["git merge --abort"], conflicted);
    expect(aborted.merging).toBeNull();
    expect(aborted.worktree.get("README.md")).toBe("B\n");
  });

  it("says when there is nothing to merge", () => {
    const state = play([...FIRST_COMMIT, "git branch old"]);
    expect(run(state, "git merge old").output).toBe("Already up to date.");
    expect(run(state, "git merge nope").output).toBe("merge: nope - not something we can merge");
  });
});

describe("rebase and reset", () => {
  it("replays the branch on top of main, leaving a straight line", () => {
    const state = play([
      ...FIRST_COMMIT,
      "git switch -c feature",
      'echo "f" > f.txt',
      "git add .",
      'git commit -m "F"',
      "git switch main",
      'echo "m" > m.txt',
      "git add .",
      'git commit -m "M"',
      "git switch feature",
    ]);
    const result = run(state, "git rebase main");
    expect(result.output).toBe("Successfully rebased and updated refs/heads/feature.");
    const tip = headCommit(result.state);
    expect(tip?.message).toBe("F");
    expect(tip?.parents).toEqual([result.state.branches.get("main")]);
    expect(checkHolds(result.state, { label: "l", expect: "linear", branch: "feature" })).toBe(
      true,
    );
  });

  it("refuses a rebase that would stop on a conflict, and changes nothing", () => {
    const state = play([
      ...FIRST_COMMIT,
      "git switch -c f",
      'echo "F" > README.md',
      'git commit -am "F"',
      "git switch main",
      'echo "M" > README.md',
      'git commit -am "M"',
      "git switch f",
    ]);
    const result = run(state, "git rebase main");
    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.output).toContain("Conflit sur README.md");
  });

  it("moves the branch back with reset --hard, and unstages with reset", () => {
    const state = play([...FIRST_COMMIT, 'echo "2" >> README.md', 'git commit -am "Deux"']);
    const result = run(state, "git reset --hard HEAD~1");
    expect(result.output).toMatch(/^HEAD is now at [0-9a-f]{7} Premier commit$/u);
    expect(result.state.worktree.get("README.md")).toBe("# Projet\n");
    const unstaged = play(['echo "n" > n.txt', "git add n.txt", "git reset n.txt"], state);
    expect(unstaged.index.has("n.txt")).toBe(false);
    expect(run(state, "git reset --hard HEAD~5").output).toContain("fatal: ambiguous argument");
  });
});

describe("runSetup", () => {
  it("starts an exercise from its commands, even in the middle of a conflict", () => {
    const setup = runSetup([
      ...FIRST_COMMIT,
      "git switch -c a",
      'echo "A" > README.md',
      'git commit -am "A"',
      "git switch main",
      'echo "B" > README.md',
      'git commit -am "B"',
      "git merge a",
    ]);
    expect(setup.ok && setup.state.merging?.conflicts).toEqual(["README.md"]);
  });

  it("names the command that fails", () => {
    expect(runSetup(["git init", "git commit -m vide"])).toMatchObject({
      ok: false,
      command: "git commit -m vide",
    });
  });
});

describe("checks", () => {
  it("ticks what the learner leaves behind", () => {
    const state = play([
      ...FIRST_COMMIT,
      "git switch -c feature",
      'echo "f" > f.txt',
      "git add .",
      'git commit -m "Ajoute f"',
      "git switch main",
      "git merge --no-ff feature",
      "git branch -d feature",
    ]);
    const holds = (check: Parameters<typeof checkHolds>[1]): boolean => checkHolds(state, check);
    expect(holds({ label: "", expect: "no-branch", branch: "feature" })).toBe(true);
    expect(holds({ label: "", expect: "on-branch", branch: "main" })).toBe(true);
    expect(holds({ label: "", expect: "commit", branch: "main", message: "Ajoute f" })).toBe(true);
    expect(holds({ label: "", expect: "commits", branch: "main", min: 3 })).toBe(true);
    expect(holds({ label: "", expect: "file", branch: "main", path: "f.txt", contains: "f" })).toBe(
      true,
    );
    expect(holds({ label: "", expect: "merge-commit", branch: "main" })).toBe(true);
    expect(holds({ label: "", expect: "linear", branch: "main" })).toBe(false);
    expect(holds({ label: "", expect: "clean" })).toBe(true);
    expect(checkHolds(play(['echo "x" > x'], state), { label: "", expect: "clean" })).toBe(false);
  });
});

describe("layoutGraph", () => {
  it("keeps a straight history in one lane", () => {
    const layout = layoutGraph(
      play([...FIRST_COMMIT, 'echo "2" >> README.md', 'git commit -am "Deux"']),
    );
    expect(layout.rows.map((r) => [r.message, r.lane])).toEqual([
      ["Deux", 0],
      ["Premier commit", 0],
    ]);
    expect(layout.rows[0]?.branches).toEqual(["main"]);
    expect(layout.edges).toEqual([{ d: "M 12 12 L 12 42", lane: 0 }]);
  });

  it("gives a branch its own lane and brings it back at the merge", () => {
    const layout = layoutGraph(
      play([
        ...FIRST_COMMIT,
        "git switch -c feature",
        'echo "f" > f.txt',
        "git add .",
        'git commit -m "Feature"',
        "git switch main",
        'echo "m" > m.txt',
        "git add .",
        'git commit -m "Main"',
        "git merge feature",
      ]),
    );
    expect(layout.rows.map((r) => [r.message, r.lane, r.merge])).toEqual([
      ["Merge branch 'feature'", 0, true],
      ["Main", 0, false],
      ["Feature", 1, false],
      ["Premier commit", 0, false],
    ]);
    expect(layout.lanes).toBe(2);
    expect(layout.edges).toHaveLength(4);
    expect(layout.rows[2]?.branches).toEqual(["feature"]);
  });

  it("draws nothing for an empty repository", () => {
    expect(layoutGraph(play(["git init"]))).toMatchObject({ rows: [], edges: [], height: 0 });
  });
});

describe("line-by-line merging", () => {
  const greet = (line: string): string[] => [
    "echo 'function greet(name) {' > greet.js",
    `echo "  return '${line} ' + name;" >> greet.js`,
    "echo '}' >> greet.js",
  ];

  it("marks only the lines in conflict, as in the lesson", () => {
    const state = play([
      "git init",
      ...greet("Hello"),
      "git add .",
      'git commit -m "greet"',
      "git switch -c feature/login",
      ...greet("Salut"),
      'git commit -am "Salut"',
      "git switch main",
      ...greet("Bonjour"),
      'git commit -am "Bonjour"',
    ]);
    const merged = run(state, "git merge feature/login");
    expect(merged.output).toBe(
      [
        "Auto-merging greet.js",
        "CONFLICT (content): Merge conflict in greet.js",
        "Automatic merge failed; fix conflicts and then commit the result.",
      ].join("\n"),
    );
    expect(merged.state.worktree.get("greet.js")).toBe(
      [
        "function greet(name) {",
        "<<<<<<< HEAD",
        "  return 'Bonjour ' + name;",
        "=======",
        "  return 'Salut ' + name;",
        ">>>>>>> feature/login",
        "}",
        "",
      ].join("\n"),
    );
  });

  it("merges two changes to different lines of a file without a conflict", () => {
    const state = play([
      "git init",
      "echo 'un' > f.txt",
      "echo 'deux' >> f.txt",
      "echo 'trois' >> f.txt",
      "git add .",
      'git commit -m "base"',
      "git switch -c a",
      "echo 'UN' > f.txt && echo 'deux' >> f.txt && echo 'trois' >> f.txt",
      'git commit -am "a"',
      "git switch main",
      "echo 'un' > f.txt && echo 'deux' >> f.txt && echo 'TROIS' >> f.txt",
      'git commit -am "main"',
    ]);
    const merged = run(state, "git merge a");
    expect(merged.output).toBe(
      "Auto-merging f.txt\nMerge made by the 'ort' strategy.\n 1 file changed",
    );
    expect(merged.state.worktree.get("f.txt")).toBe("UN\ndeux\nTROIS\n");
    const rebased = run(play(["git switch a"], state), "git rebase main");
    expect(rebased.ok).toBe(true);
    expect(rebased.state.worktree.get("f.txt")).toBe("UN\ndeux\nTROIS\n");
  });

  it("ticks a deleted branch only if it existed", () => {
    const fresh = play(FIRST_COMMIT);
    const check = { label: "", expect: "no-branch", branch: "fix" } as const;
    expect(checkHolds(fresh, check)).toBe(false);
    expect(checkHolds(play(["git branch fix", "git branch -d fix"], fresh), check)).toBe(true);
  });
});

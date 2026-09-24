#!/usr/bin/env node
/**
 * No em dash (U+2014) in anything the site ships.
 *
 * French does not use it the way English does, and it had spread through page
 * titles, e-mails, table placeholders and the changelog. They were replaced by
 * the punctuation French uses (a colon, commas, parentheses, a full stop), and
 * this keeps them out.
 *
 *   node scripts/check-typography.mjs            every tracked file in scope
 *   node scripts/check-typography.mjs a.tsx b.md  only these (the pre-commit hook)
 *
 * Out of scope: docs/, which the site does not serve, and applied Prisma
 * migrations, whose checksum Prisma verifies (editing one breaks deploys).
 * The en dash (U+2013) stays allowed: it is the French mark for a range, as in
 * "10–200 caractères".
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const EM_DASH = "—";
const IN_SCOPE = /^(apps|packages|content)\//;
const OUT_OF_SCOPE = [/^packages\/db\/prisma\/migrations\//, /\/node_modules\//];
const TEXT = /\.(tsx?|jsx?|mjs|cjs|mdx?|json|css|html|txt|ya?ml)$/;

const root = resolve(import.meta.dirname, "..");

function inScope(path) {
  return IN_SCOPE.test(path) && TEXT.test(path) && !OUT_OF_SCOPE.some((re) => re.test(path));
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "apps", "packages", "content"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
}

const args = process.argv.slice(2);
const files = (args.length > 0 ? args.map((f) => relative(root, resolve(f))) : trackedFiles())
  .map((f) => f.replace(/\\/g, "/"))
  .filter(inScope);

const hits = [];
for (const file of files) {
  const lines = readFileSync(resolve(root, file), "utf8").split("\n");
  lines.forEach((line, i) => {
    if (line.includes(EM_DASH)) hits.push(`${file}:${String(i + 1)}: ${line.trim()}`);
  });
}

if (hits.length > 0) {
  process.stderr.write(
    `Tiret cadratin (U+2014) trouvé. Remplace-le par la ponctuation française : deux-points, virgules, parenthèses ou point.\n\n${hits.join("\n")}\n`,
  );
  process.exit(1);
}
process.stdout.write(`Typographie : ${String(files.length)} fichiers, aucun tiret cadratin.\n`);

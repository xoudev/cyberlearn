// Content authoring helper for content/lessons MDX.
//   node content-check.mjs [--fix] [subdir]        (from apps/admin)
//   pnpm --filter @cyberlearn/admin content:check [--fix] [subdir]
// --fix: quote frontmatter title/description, convert <CodePlayground> children
//        to the safe template-literal starterCode form, drop an authoring note
//        left at the end of a lesson.
// Always validates with the console's own code, lib/services/lesson-file-check.ts,
// so that a file this accepts is a file the import and the synchronisation
// accept: the frontmatter against the import schema, the injection scan, then
// the check the editors run on save (every section rendered, quizzes, strings,
// and the catalogue's rules: authoring note, em dash, a diagram markdown would
// rewrite), each problem at its line in the file. Then the catalogue's own:
// >=300 words, >=1 Quiz, a refCode used once.
// Mermaid's own parser is not run here, the console does not depend on mermaid:
// pnpm --filter @cyberlearn/web content:diagrams does it, and CI runs both.
//
// Plain node runs it (node content-check.mjs from apps/admin, or the package's
// content:check): the TypeScript it imports is transpiled on the fly by the
// TypeScript compiler the package already has, through the hooks below.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import ts from "typescript";

if (typeof registerHooks !== "function") {
  console.error("content-check demande Node 22.15 ou plus récent (module.registerHooks).");
  process.exit(1);
}

const TYPESCRIPT = /\.tsx?$/;

registerHooks({
  // The sources import "./x.js" for x.ts and "../y" for y.ts, as the bundlers
  // and Vitest resolve them; Node's own resolution wants the file as named.
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      const parent = context.parentURL;
      if (parent === undefined || !TYPESCRIPT.test(parent) || !specifier.startsWith(".")) {
        throw error;
      }
      const base = specifier.replace(/\.js$/, "");
      for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
        const url = new URL(candidate, parent);
        if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
      }
      throw error;
    }
  },
  // Transpiled, not stripped: Node's type stripping refuses parameter
  // properties, which packages/lib uses. Every tsconfig sets isolatedModules,
  // so each file transpiles on its own.
  load(url, context, nextLoad) {
    if (!url.startsWith("file:") || !TYPESCRIPT.test(new URL(url).pathname)) {
      return nextLoad(url, context);
    }
    const fileName = fileURLToPath(url);
    const { outputText } = ts.transpileModule(readFileSync(fileName, "utf8"), {
      fileName,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    return { format: "module", source: outputText, shortCircuit: true };
  },
});

const { checkLessonFile } = await import("./lib/services/lesson-file-check.ts");

// pnpm may pass on the "--" that separates its own options from the script's.
const args = process.argv.slice(2).filter((a) => a !== "--");
const FIX = args.includes("--fix");
const sub = args.find((a) => !a.startsWith("--"));
const ROOT = path.resolve(import.meta.dirname, "../../content/lessons");

// A note the author leaves at the end of a lesson while writing it - "OK 03
// écrit", "OK 07-csrf-sessions.mdx écrit". The check refuses one anywhere;
// --fix removes the one at the end, where the authors left them.
const MARKER = /\n[ \t]*OK [^\n]*crit[ \t]*$/;

function quoteFrontmatter(txt) {
  const lines = txt.split(/\r?\n/);
  if (lines[0].trim() !== "---") return txt;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") break;
    const m = lines[i].match(/^(title|description):\s*(.*)$/);
    if (m) {
      const v = m[2].trim();
      const q = (v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"));
      if (!q) lines[i] = `${m[1]}: "${v.replace(/"/g, '\\"')}"`;
    }
  }
  return lines.join("\n");
}

function fixCodePlayground(txt) {
  txt = txt.replace(/<CodePlayground([^>]*?)>([\s\S]*?)<\/CodePlayground>/g, (_m, attrs, code) => {
    let lang = "python";
    const lm = attrs.match(/language="(\w+)"/);
    if (lm) lang = lm[1];
    let c = code.replace(/^\n+/, "").replace(/\n+$/, "");
    // Some lessons wrap the code in an inner ```lang fence; unwrap it.
    const fence = c.match(/^```[\w-]*\n([\s\S]*?)\n```$/);
    if (fence) c = fence[1];
    c = c.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
    return `<CodePlayground language="${lang}" starterCode={\`${c}\`} />`;
  });
  // Outside starterCode template literals, JSX string attributes cannot use
  // \" (acorn rejects it). Replace \" with a single quote in those regions.
  const parts = txt.split(/(starterCode=\{`[\s\S]*?`\})/);
  return parts.map((p, i) => (i % 2 === 1 ? p : p.replaceAll('\\"', "'"))).join("");
}

function stripAuthoringMarker(txt) {
  const trimmed = txt.replace(/\s+$/, "");
  if (!MARKER.test(trimmed)) return txt;
  // Second trim: the marker usually sits after a blank line, which would
  // otherwise be left dangling at the end of the file.
  return `${trimmed.replace(MARKER, "").replace(/\s+$/, "")}\n`;
}

/** The refCode a file claims, whether or not the rest of it is valid. */
function refCodeOf(raw) {
  try {
    const { refCode } = matter(raw).data;
    return typeof refCode === "string" ? refCode : null;
  } catch {
    return null;
  }
}

const dirs = sub ? [sub] : readdirSync(ROOT);
const files = [];
for (const d of dirs) {
  const full = path.join(ROOT, d);
  try {
    for (const f of readdirSync(full)) if (f.endsWith(".mdx")) files.push(path.join(full, f));
  } catch {}
}
files.sort();

let fail = 0;
const seen = new Map();
for (const file of files) {
  let raw = readFileSync(file, "utf8");
  const name = `${path.basename(path.dirname(file))}/${path.basename(file)}`;
  if (FIX) {
    const fixed = stripAuthoringMarker(fixCodePlayground(quoteFrontmatter(raw)));
    if (fixed !== raw) {
      writeFileSync(file, fixed);
      raw = fixed;
    }
  }

  const errs = [];
  const result = await checkLessonFile(raw);
  if (!result.ok) {
    for (const e of result.errors) {
      // The body's problems already say where they are; a field of the
      // frontmatter is named.
      errs.push(e.line === undefined && e.field ? `${e.field} : ${e.message}` : e.message);
    }
  } else {
    const { body } = result;
    if (body.split(/\s+/).filter(Boolean).length < 300) errs.push("moins de 300 mots");
    if (!/<Quiz[\s>]/.test(body)) errs.push("aucun Quiz");
  }
  const refCode = refCodeOf(raw);
  if (refCode !== null) {
    if (seen.has(refCode)) errs.push(`refCode déjà pris par ${seen.get(refCode)}`);
    else seen.set(refCode, name);
  }

  if (errs.length) {
    console.log(`FAIL ${name}`);
    for (const e of errs) console.log(`     ${e}`);
    fail++;
  } else console.log(`OK   ${name}  [${result.metadata.refCode}] ${result.metadata.difficulty}`);
}
console.log(`\n${files.length - fail}/${files.length} valides`);
process.exit(fail ? 1 : 0);

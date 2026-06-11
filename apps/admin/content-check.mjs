// Content authoring helper for content/lessons MDX.
//   node content-check.mjs [--fix] [subdir]
// --fix: quote frontmatter title/description, convert <CodePlayground> children
//        to the safe template-literal starterCode form.
// Always validates: frontmatter, injection scan, @mdx-js/mdx compile (the same
// first three layers the admin import pipeline runs), >=300 words, >=1 Quiz.
// Run from apps/admin (where gray-matter and @mdx-js/mdx resolve).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { compile } from "@mdx-js/mdx";

const FIX = process.argv.includes("--fix");
const sub = process.argv.find((a) => !a.startsWith("--") && !a.includes("node") && !a.endsWith(".mjs"));
const ROOT = path.resolve("../../content/lessons");

const INJECTION = [
  /<script[\s>]/i, /<iframe[\s>]/i, /<object[\s>]/i, /<embed[\s>]/i,
  /javascript:/i, /data:text\/html/i, /\bon[A-Z][a-zA-Z]*\s*=/, /dangerouslySetInnerHTML/i,
];
const REFCODE = /^CL-LSN-\d{3}-V\d{2}$/;
const SLUG = /^[a-z0-9-]+$/;

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
    const fixed = fixCodePlayground(quoteFrontmatter(raw));
    if (fixed !== raw) { writeFileSync(file, fixed); raw = fixed; }
  }
  const errs = [];
  let parsed;
  try { parsed = matter(raw); } catch (e) { console.log(`FAIL ${name}: YAML ${e.message.split("\n")[0]}`); fail++; continue; }
  const d = parsed.data;
  if (!REFCODE.test(d.refCode || "")) errs.push("refCode");
  if (!SLUG.test(d.slug || "")) errs.push("slug");
  if (!["DEV", "CYBERSEC", "NETWORK"].includes(d.category)) errs.push("category");
  if (seen.has(d.refCode)) errs.push(`refCode dup ${seen.get(d.refCode)}`);
  seen.set(d.refCode, name);
  const body = parsed.content.trim();
  const stripped = body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  for (const p of INJECTION) if (p.test(stripped)) errs.push(`injection ${p}`);
  if (body.split(/\s+/).filter(Boolean).length < 300) errs.push("<300 mots");
  if (!/<Quiz[\s>]/.test(body)) errs.push("aucun Quiz");
  try { await compile(body, { outputFormat: "function-body", development: false }); }
  catch (e) { errs.push(`MDX ${e.line ? `L${e.line}:${e.column}` : ""} ${String(e.reason || e.message).slice(0, 55)}`); }
  if (errs.length) { console.log(`FAIL ${name}: ${errs.join(" | ")}`); fail++; }
  else console.log(`OK   ${name}  [${d.refCode}] ${d.difficulty}`);
}
console.log(`\n${files.length - fail}/${files.length} valides`);
process.exit(fail ? 1 : 0);

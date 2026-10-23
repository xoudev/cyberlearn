import { findGlossaryTerms, type GlossaryHit } from "@cyberlearn/lib/glossary/match";
import type { Block } from "@/lib/lesson-blocks";
import { inlineTokens } from "./inline-markdown";

/**
 * The glossary in a lesson, as on the site: each technical word is underlined
 * the first time it appears in a section, and a press shows its definition.
 *
 * Which block underlines which word is decided for the whole section at once
 * (glossaryPlan), so that a block that renders again on its own (a theme
 * change, say) underlines the same words as the first time.
 */

/**
 * The text of a block where a glossary word can be underlined: its plain
 * prose, with inline code, emphasis and links taken out, as renderInline cuts
 * them (a line break stands in for each, so no word runs across one).
 */
function plainText(text: string): string {
  return inlineTokens(text)
    .map((token) => (token.kind === "text" ? token.text : "\n"))
    .join("");
}

function proseOf(block: Block): string | null {
  if (block.kind === "paragraph" || block.kind === "callout") return plainText(block.text);
  if (block.kind === "list") return block.items.map(plainText).join("\n");
  return null;
}

/** For each block of a section, the glossary words it is the first to use. */
export function glossaryPlan(blocks: readonly Block[]): ReadonlySet<string>[] {
  const seen = new Set<string>();
  return blocks.map((block) => {
    const prose = proseOf(block);
    if (prose === null) return new Set<string>();
    return new Set(findGlossaryTerms(prose, seen).map((hit) => hit.term.slug));
  });
}

/**
 * The words of `remaining` found in a piece of plain text, the first of each
 * only; each word found is taken out of `remaining`, so the next piece of the
 * same block does not underline it again.
 */
export function glossaryHits(text: string, remaining: Set<string>): GlossaryHit[] {
  if (remaining.size === 0) return [];
  return findGlossaryTerms(text, new Set()).filter((hit) => remaining.delete(hit.term.slug));
}

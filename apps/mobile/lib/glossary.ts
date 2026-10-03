import { findGlossaryTerms, type GlossaryHit } from "@cyberlearn/lib/glossary/match";
import type { Block } from "@/lib/lesson-blocks";

/**
 * The glossary in a lesson, as on the site: each technical word is underlined
 * the first time it appears in a section, and a press shows its definition.
 *
 * Which block underlines which word is decided for the whole section at once
 * (glossaryPlan), so that a block that renders again on its own (a theme
 * change, say) underlines the same words as the first time.
 */

/** Inline code, bold and italics, as renderInline cuts them. */
const INLINE_TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;

/**
 * The text of a block where a glossary word can be underlined: its plain
 * prose, with inline code and emphasis taken out (a line break stands in for
 * each, so no word runs across one).
 */
function plainText(text: string): string {
  return text.replace(INLINE_TOKEN, "\n");
}

function proseOf(block: Block): string | null {
  switch (block.kind) {
    case "paragraph":
    case "callout":
      return plainText(block.text);
    case "list":
      return block.items.map(plainText).join("\n");
    default:
      return null;
  }
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

import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { LESSON_REMARK_PLUGINS } from "@cyberlearn/lib/mdx-check";

/**
 * How a lesson section is compiled. Its own module so a test can render real
 * lessons with exactly what the page uses.
 */
export const LESSON_MDX_OPTIONS = {
  parseFrontmatter: true,
  // blockJS: false - next-mdx-remote's default blockJS:true strips all JSX
  // expression props (options={[...]}, correct={1}), breaking Quiz/CodePlayground.
  // What it protected against is covered by LESSON_REMARK_PLUGINS instead:
  // prose expressions are stripped, and an attribute's braces must hold a
  // value, never code (remarkLiteralValuesOnly). That matters because lessons
  // are not admin-only: a teacher writes them for their classes too.
  // next-mdx-remote's blockDangerousJS stays on underneath as a second layer.
  blockJS: false,
  mdxOptions: {
    // The same list the save-time check runs, so what the editor accepts is
    // what this page renders. See @cyberlearn/lib/mdx-check.
    remarkPlugins: LESSON_REMARK_PLUGINS,
    // rehypeSanitize is intentionally absent here: it silently drops
    // mdxJsxFlowElement nodes, which would strip CodePlayground, Quiz, and
    // SimulatedTerminal components from the rendered output. User-generated
    // content (Q&A, bio) is sanitized separately.
    rehypePlugins: [rehypeSlug, rehypeHighlight],
  },
};

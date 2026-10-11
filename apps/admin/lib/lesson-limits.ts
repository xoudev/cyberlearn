/**
 * The bounds of a lesson's fields, for the forms and the actions that check
 * them.
 *
 * They were written twice, once as HTML attributes and once in the Zod
 * schemas, and the two had drifted: the create form took a 1,000-character
 * description the server refused past 500, and offered 480 minutes and
 * 5,000 XP where the server and the MDX import accept 600 and 10,000. A field
 * the browser lets through and the server rejects is an error the admin only
 * meets after submitting. One list, read by both, keeps them equal.
 */
export const LESSON_LIMITS = {
  slugMin: 3,
  slugMax: 100,
  titleMin: 3,
  titleMax: 200,
  descriptionMin: 10,
  descriptionMax: 500,
  minutesMax: 600,
  xpMax: 10_000,
} as const;

/**
 * What a slug may contain, as the source of a `pattern` attribute.
 *
 * The browser compiles a `pattern` with the `v` flag, where a bare `-` inside
 * a class is a syntax error and the whole attribute is dropped without a word,
 * so the dash is escaped. The forms put this string in the attribute, and
 * LESSON_SLUG is built from it, so the two checks cannot drift apart.
 */
export const LESSON_SLUG_PATTERN = String.raw`[a-z0-9\-]+`;

/** The same rule as a RegExp, for the actions' schemas. */
export const LESSON_SLUG = new RegExp(`^(?:${LESSON_SLUG_PATTERN})$`, "u");

/** The sentence that explains it. */
export const LESSON_SLUG_HINT = "Lettres minuscules sans accent, chiffres et tirets uniquement.";

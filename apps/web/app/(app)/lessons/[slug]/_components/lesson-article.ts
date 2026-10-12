/**
 * The classes of the article a lesson is drawn in. The lesson page and the
 * editor's preview (app/preview) both use them: the prose's measure and the
 * components' width hang off them (globals.css), and a preview drawn on other
 * classes would show something else than the page.
 */
export const LESSON_ARTICLE_CLASS = "prose lesson-content max-w-none";

/**
 * The longest note on a lesson the server keeps, in characters. Shared by the
 * save action, which refuses anything longer, and the editor, which stops
 * there and says so: the editor used to let the note grow past it, and every
 * save after that failed under a "Sauvegardé auto".
 */
export const NOTE_CONTENT_MAX = 20_000;

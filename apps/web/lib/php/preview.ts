/**
 * A page's answer, made safe to look at. The learner is shown the page as a
 * browser would draw it, in a frame that can do nothing: sandbox="" (no
 * script, no form, no popup, a world of its own) inside this document, whose
 * own policy forbids every fetch but inline style and data: images. A link in
 * it opens nowhere. The source of the answer is shown next to it, as text.
 */
export function previewDocument(body: string): string {
  return [
    "<!doctype html>",
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">`,
    '<meta name="color-scheme" content="light">',
    '<base target="_blank">',
    body,
  ].join("");
}

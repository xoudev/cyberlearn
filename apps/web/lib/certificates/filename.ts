/**
 * The name the certificate PDF downloads under: "CyberLearn - <path>.pdf".
 *
 * The title was filtered to ASCII letters and digits outright, which dropped
 * every accented letter: "Réseaux" downloaded as "CyberLearn - Rseaux.pdf",
 * and "Fondamentaux de l'informatique" glued into "linformatique". Accents are
 * now taken off their letters first, and anything else turns into a space
 * before the spaces are folded.
 *
 * The set stays ASCII letters, digits, space, "-" and "_" on purpose: the name
 * travels in the signed URL's `download` parameter, which storage-js encodes
 * with URLSearchParams and then again with encodeURI. A character the first
 * pass percent-encodes (an apostrophe, an accent) reaches the storage server
 * with its "%" escaped and lands in the file name as "%27".
 */
export function certificateFilename(pathTitle: string): string {
  const safeTitle = pathTitle
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9 \-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
  return safeTitle ? `CyberLearn - ${safeTitle}.pdf` : "CyberLearn - Certificat.pdf";
}

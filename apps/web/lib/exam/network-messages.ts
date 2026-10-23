/**
 * What the exams say when the call itself fails, the network or a deploy,
 * rather than the server refusing: nothing reached it, so nothing was lost,
 * and the answers are still on the screen (and on the device, see
 * @cyberlearn/lib/exam/answers-draft). Said by the final exam and by the mock
 * exam alike, so a reader meets the same sentence.
 */

/** The copy could not be sent: the button to hand it in is back, to try again. */
export const SUBMIT_FAILED = "Envoi impossible : vérifie ta connexion, tes réponses sont gardées.";

/** The final exam could not be drawn or taken up again: the rules are back, with their button. */
export const START_FAILED =
  "Impossible de démarrer l'examen pour l'instant : vérifie ta connexion et réessaie.";

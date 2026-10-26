/**
 * What somebody is told about their own content, at each point it moves.
 *
 * The three moments are: it was taken down, it was given back, it was
 * destroyed. Each of them is a sentence a person reads once, in a notification
 * and again in an e-mail, and the two have to say the same thing - which is why
 * they are built here rather than written twice.
 *
 * None of them names the rule that fired. Naming it turns the filter into a
 * puzzle: people retry until they find the wording that gets through, which is
 * the opposite of what it is for.
 */

/**
 * The points at which somebody is told. "hidden" is a moderator taking down
 * something that was up, from the console: the screen had let it through, or
 * somebody reported it.
 */
export type ModerationStage = "held" | "hidden" | "restored" | "removed" | "refused";

/**
 * How each surface is referred to, in the possessive.
 *
 * "Ton message a été retiré" is true of a forum reply and wrong about a
 * question, and being told the wrong thing about your own writing is how a
 * notice stops being read.
 */
const SURFACE_NOUN: Record<string, string> = {
  "lesson.question": "ta question",
  "lesson.answer": "ta réponse",
  "forum.topic": "ton sujet",
  "forum.post": "ton message",
  "challenge.writeup": "ta solution",
  "class.resource": "ta ressource",
  "note.share": "ta note",
};

/** The neutral fall-back, for a surface this was not taught about. */
const DEFAULT_NOUN = "ton message";

export function surfaceNoun(surface: string): string {
  return SURFACE_NOUN[surface] ?? DEFAULT_NOUN;
}

export interface ModerationNotice {
  title: string;
  body: string;
}

export interface ModerationNoticeInput {
  stage: ModerationStage;
  /** One of the recorded surfaces, e.g. "forum.post". */
  surface: string;
  /**
   * The sanction that came with the decision, already in French, or null.
   * Only ever set alongside "removed": nothing is sanctioned for a message
   * that turned out to be fine.
   */
  sanctionLabel?: string | null;
}

/**
 * The notice for one moment, in one voice.
 *
 * "held" is the only one that is not a verdict, and it says so: the message
 * exists, nobody else can see it, somebody will look. The other two are the
 * answer to that.
 */
export function moderationNotice(input: ModerationNoticeInput): ModerationNotice {
  const noun = surfaceNoun(input.surface);
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);
  // The sentences agree with the noun: "ton message a été supprimé", "ta
  // question a été supprimée". Every feminine noun here is a "ta ...".
  const fem = noun.startsWith("ta ");
  const e = fem ? "e" : "";
  const it = fem ? "la" : "le";
  const It = fem ? "Elle" : "Il";

  // Sharing a note publishes nothing, so there is no held state and no
  // restoring: the share simply did not happen, and the note is still the
  // author's to edit and send again. Saying "en attente de validation" here
  // would promise a publication that is never coming.
  if (input.stage === "refused") {
    return {
      title: `${Noun} n'a pas été partagé${e}`,
      body: `La modération automatique a signalé ${noun}, donc le partage n'a pas eu lieu. ${Noun} est toujours là, tel${fem ? "le" : ""} que tu l'as écrit${e} : tu peux ${it} modifier et ${it} repartager.`,
    };
  }

  if (input.stage === "held") {
    return {
      title: `${Noun} est en attente de validation`,
      body: `La modération automatique a signalé ${noun}. Personne d'autre ne ${it} voit pour l'instant : un modérateur va ${it} relire.`,
    };
  }

  // Worded without an agreement on the noun: "ton message" and "ta question"
  // take the same sentence. Not a verdict either: it is out of sight and can
  // come back, so nothing claims a rule was broken. Nor does it promise a line
  // in the moderation record, which lists what the screen flagged.
  if (input.stage === "hidden") {
    return {
      title: `${Noun} n'est plus visible`,
      body: `Après relecture, un modérateur a masqué ${noun} : les autres n'y ont plus accès. Si tu penses que c'est une erreur, écris à l'équipe depuis la page Aide.`,
    };
  }

  if (input.stage === "restored") {
    return {
      title: `${Noun} est de nouveau visible`,
      body: `Un modérateur a examiné ${noun} : c'était une fausse alerte. ${It} est revenu${e} à sa place, sans rien perdre.`,
    };
  }

  const sanction = input.sanctionLabel;
  return {
    title: `${Noun} a été supprimé${e}`,
    body:
      sanction === null || sanction === undefined || sanction === ""
        ? `Un modérateur a examiné ${noun} et confirmé qu'${fem ? "elle" : "il"} enfreint les règles de la plateforme. ${It} a été supprimé${e}.`
        : `Un modérateur a examiné ${noun} et confirmé qu'${fem ? "elle" : "il"} enfreint les règles de la plateforme. ${It} a été supprimé${e}, et une sanction a été appliquée : ${sanction}.`,
  };
}

/**
 * How many flagged messages an account may produce in an hour before it is
 * stopped altogether.
 *
 * The screen already takes each one out of sight, so this is not about the
 * content: it is about the queue. One person can otherwise fill a morning's
 * moderation with a script, and the reports that matter end up behind it.
 *
 * Generous on purpose. Somebody rephrasing an awkward sentence three times is
 * not the case this exists for.
 */
export const FLAG_BUDGET = 5;

/** The window the budget is counted over. */
export const FLAG_BUDGET_WINDOW_MS = 3_600_000;

/** What somebody is told when they run out of budget. */
export const FLAG_BUDGET_MESSAGE =
  "Plusieurs de tes derniers messages ont été signalés par la modération. " +
  "Tu ne peux plus publier pendant un moment : réessaie dans une heure.";

/**
 * What somebody is told when the screen takes their message down.
 *
 * One sentence, in one place, because the surfaces that can produce it (the
 * site's forum and lesson Q&A, and the app) would otherwise each phrase it
 * slightly differently and one of them would end up implying the message was
 * deleted.
 *
 * It says three things on purpose: the message exists, nobody else can read it
 * yet, and a person will decide. A message that appears to post and then is not
 * in the thread reads as a bug, and the next thing that happens is the person
 * posting it again.
 *
 * It does not say which rule fired. Naming it turns the filter into a puzzle:
 * people retry until they find the wording that gets through, which is the
 * opposite of what it is for.
 */
export const HELD_FOR_REVIEW =
  "Message enregistré, mais pas encore publié : la modération automatique l'a signalé. " +
  "Toi seul le vois pour l'instant, le temps qu'un modérateur le relise.";

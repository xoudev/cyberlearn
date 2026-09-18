/**
 * What somebody is told when the screen takes their message down.
 *
 * One sentence, in one place, because the four surfaces that can produce it
 * would otherwise each phrase it slightly differently and one of them would end
 * up implying the message was deleted.
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

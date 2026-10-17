// @cyberlearn/db/gamification
//
// The XP and badge primitives that run inside a caller's transaction, shared
// by the site and the console. On a path of their own, apart from the
// package's index, for the same reason as ./catalogue: they need neither the
// Prisma client nor a repository, only the transaction they are handed. A
// test that replaces the whole of "@cyberlearn/db" with a fake still runs the
// real credit through its fake transaction, which is what the site's tests of
// the lesson, review and certificate flows check.

export { creditXp, type CreditXpOptions, type CreditXpResult } from "./xp/credit.js";
export { recordSeasonXp } from "./league/record-season-xp.js";
export {
  awardBadges,
  EMPTY_AWARD,
  type AwardableBadge,
  type AwardBadgesResult,
} from "./badges/award.js";

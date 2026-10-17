// The single XP credit lives in the db package, where the console's
// corrections reach it too. Re-exported here so the site's callers, and the
// tests that replace this module, keep their import.
export { creditXp, type CreditXpOptions, type CreditXpResult } from "@cyberlearn/db/gamification";

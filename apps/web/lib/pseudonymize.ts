// Moved to @cyberlearn/lib, where the admin app can reach it too: the console
// had a second copy of this HMAC written inline in its rate limiter, with a
// comment pointing at this file. Re-exported rather than deleted because a
// dozen call sites here read it by this path, and the import path is not the
// interesting part of any of them.
export { pseudonymize } from "@cyberlearn/lib/pseudonymize";

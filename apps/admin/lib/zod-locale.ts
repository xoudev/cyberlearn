import { z } from "zod";

/**
 * Zod's own messages, in French, for the whole console.
 *
 * A form error that the action does not word itself is shown as Zod wrote it,
 * and Zod writes English by default: "Too big: expected string to have <=500
 * characters" under a French label. Its French locale says the same thing in
 * the console's language.
 *
 * Called once, from instrumentation, when the server starts. Zod keeps the
 * setting on globalThis, so every module that imports it afterwards, actions
 * included, reads the same one. The forms only show what the actions return,
 * and nothing on the client runs a Zod schema, so the server is the only place
 * that needs it.
 */
export function configureZodLocale(): void {
  z.config(z.locales.fr());
}

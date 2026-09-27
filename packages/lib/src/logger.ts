import { pino } from "pino";

/**
 * The server's logger: one JSON line per event on stdout, which is what Vercel
 * collects and what a log drain can parse. No transport, no pretty-printer:
 * pino's transports run in a worker thread that Next's bundler does not carry
 * over, and a formatter is a dev-time convenience the console reads fine
 * without.
 *
 * Reached through @cyberlearn/lib/logger and never re-exported from the package
 * index, for the reason pseudonymize gives: the index is imported by client
 * components and by the mobile app, and neither has any business pulling in a
 * Node logger. The Edge middleware cannot run pino either and keeps console.
 *
 * What goes in follows docs/security/logging.md: opaque ids, never an e-mail,
 * a name or a raw IP, and of a thrown value only its message. `redact` is the
 * net under that rule, not a licence to break it - it only knows the keys it
 * is told about.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? defaultLevel(),
  // pid and hostname say nothing on a serverless function and cost a field per line.
  base: null,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "email",
      "*.email",
      "to",
      "*.to",
      "ip",
      "*.ip",
      "password",
      "*.password",
      "token",
      "*.token",
      "displayName",
      "*.displayName",
    ],
    censor: "[redacted]",
  },
});

function defaultLevel(): string {
  if (process.env.NODE_ENV === "test") return "silent";
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

/**
 * The only part of a thrown value that may reach a log line.
 *
 * A whole error object from a third-party SDK can serialise the request that
 * failed - Resend's carries the recipient - so a call site logs this string,
 * never the object. Supabase and Postgrest errors are plain objects with a
 * message rather than Error instances, hence the second branch.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const { message } = err;
    if (typeof message === "string") return message;
  }
  return String(err);
}

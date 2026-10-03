import {
  deleteAccount,
  erasureDate,
  findAccountsToErase,
  findAccountsToWarn,
  recordInactivityNotice,
} from "@cyberlearn/db";
import { sendInactivityNoticeEmail } from "@cyberlearn/email";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { env } from "@/lib/env";
import { hashKeepToken, newKeepToken } from "@/lib/rgpd/keep-token";

/**
 * One night of the inactive-accounts job (packages/db/src/rgpd/inactive-accounts.ts
 * says when an account is warned and when it is erased).
 *
 * Erasures first, then notices, each capped so that a night fits in the
 * route's time budget; whatever is left waits for the next night, and nobody
 * is erased early for it, since every erasure needs its own 30-day-old notice.
 */

/** Per night. An erasure also cleans Storage and the auth identity: slow. */
export const ERASURES_PER_RUN = 10;
/** Per night. One e-mail each. */
export const NOTICES_PER_RUN = 50;

export interface InactiveAccountsSummary {
  erased: number;
  erasureFailures: number;
  warned: number;
  noticeFailures: number;
}

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

export async function runInactiveAccounts(now: Date): Promise<InactiveAccountsSummary> {
  const summary: InactiveAccountsSummary = {
    erased: 0,
    erasureFailures: 0,
    warned: 0,
    noticeFailures: 0,
  };

  for (const { id } of await findAccountsToErase(now, ERASURES_PER_RUN)) {
    try {
      await deleteAccount(id, {
        ip: "cron",
        userAgent: "cron/inactive-accounts",
        action: "user.account.erased_inactive",
      });
      summary.erased++;
    } catch (err) {
      // One account that will not go must not stop the others.
      summary.erasureFailures++;
      logger.error({ scope: "rgpd", err: errorMessage(err) }, "inactive account erasure failed");
    }
  }

  for (const account of await findAccountsToWarn(now, NOTICES_PER_RUN)) {
    const token = newKeepToken();
    try {
      await sendInactivityNoticeEmail({
        apiKey: env.RESEND_API_KEY,
        from: env.RESEND_FROM_EMAIL,
        to: account.email,
        displayName: account.displayName,
        eraseOn: DATE_FORMAT.format(erasureDate(now)),
        keepUrl: `${env.NEXT_PUBLIC_SITE_URL}/account/keep?token=${token}`,
        siteUrl: env.NEXT_PUBLIC_SITE_URL,
      });
    } catch (err) {
      // Not recorded: no erasure can lean on a notice that never arrived, and
      // the account is warned again tomorrow.
      summary.noticeFailures++;
      logger.error({ scope: "rgpd", err: errorMessage(err) }, "inactivity notice failed");
      continue;
    }
    try {
      await recordInactivityNotice(account.id, now, hashKeepToken(token));
      summary.warned++;
    } catch (err) {
      // The mail went but nothing says so: no erasure follows from it, and the
      // account is warned again tomorrow, with a link that works.
      summary.noticeFailures++;
      logger.error({ scope: "rgpd", err: errorMessage(err) }, "inactivity notice not recorded");
    }
  }

  return summary;
}
